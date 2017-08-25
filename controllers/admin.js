const fs = require('fs'),
      util = require('util'),
      express = require('express'),
      router = express.Router(),
      auth = require('../middleware/auth'),
      bodyParser = require('body-parser'),
      multer = require('multer'),

      Review = require('../models/review/review'),
      Post = require('../models/post/post'),
      Distillery = require('../models/distillery/distillery'),
      DrinkType = require('../models/drink-type/drink-type'),
      Rarity = require('../models/rarity/rarity'),
      Region = require('../models/region/region'),

      upload = multer({ dest: 'public/uploads/', preservePath: true }),
      readdir = util.promisify(fs.readdir),
      mkdir = util.promisify(fs.mkdir),
      unlink = util.promisify(fs.unlink),
      rename = util.promisify(fs.rename),
      rmrf = util.promisify(require('rimraf'));


router.use(bodyParser.urlencoded({ extended: false }));


// admin landing page, showing actions and user's items
router.get('/', auth.requireSession, auth.getCurrentUser, function (req, res, next) {
  return Promise.all([
      Review.list({
        limit: 5,
        filters: [{ field: 'author', value: res.locals.currentUser.id }]
      }),
      Post.list({
        limit: 5,
        filters: [{ field: 'author', value: res.locals.currentUser.id }]
      })
    ])
    .then(results => {
      // todo: move to template
      return res.render('../views/admin/index.twig', {
        reviews: results[0],
        posts: results[1]
      });
    })
    .catch(next);
});


// list all reviews
router.get('/reviews', auth.requireSession, auth.getCurrentUser, function (req, res, next) {
  return res.send('list of reviews');
});


// new review
router.get('/reviews/new', auth.requireSession, auth.getCurrentUser, function (req, res, next) {
  return Promise.all([
      Review.list({ orderBy: 'title', order: 'ASC' }),
      Post.list({ orderBy: 'title', order: 'ASC' }),
      Distillery.list(),
      DrinkType.list(),
      Rarity.list(),
      Region.list()
    ])
    .then(results => {
      return res.render('../views/admin/review.twig', {
        reviews: results[0],
        posts: results[1],
        distilleries: results[2],
        drinkTypes: results[3],
        rarities: results[4],
        regions: results[5]
      });
    })
    .catch(next);
});


// post a new review
router.post('/reviews/new', auth.requireSession, auth.getCurrentUser, function (req, res, next) {
  let data = Object.assign({}, req.body);

  for (let key of Object.keys(data)) {
    // cull form empties, for the benefit of clean validation
    if (data[key] === '') {
      delete data[key];
    }
  }

  // automatically assign author
  data.author = res.locals.currentUser.id;

  return Review.create(data)
    .then(review => {
      return res.redirect('/admin');
    })
    .catch(err => {
      console.log(err);
      return res.redirect('/admin/reviews/new');
    });

});


// edit existing review
router.get('/reviews/:id', auth.requireSession, auth.getCurrentUser, function (req, res, next) {
  return res.send('editing review ' + req.params.id);
});


// delete a review
router.get('/reviews/delete/:id', auth.requireSession, function (req, res, next) {
  return Review.delete(parseInt(req.params.id, 10))
    .then(() => {
      return res.redirect('/admin');
    })
    .catch(next);
});


// publish a review
router.get('/reviews/publish/:id', auth.requireSession, function (req, res, next) {
  return Review.alter(parseInt(req.params.id, 10), { is_published: true })
    .then(review => {
      return res.redirect('/admin');
    })
    .catch(next);
});


// unpublish a review
router.get('/reviews/unpublish/:id', auth.requireSession, function (req, res, next) {
  return Review.alter(parseInt(req.params.id, 10), { is_published: false })
    .then(review => {
      return res.redirect('/admin');
    })
    .catch(next);
});


// publish a post
router.get('/posts/publish/:id', auth.requireSession, function (req, res, next) {
  return Post.alter(parseInt(req.params.id, 10), { is_published: true })
    .then(post => {
      return res.redirect('/admin');
    })
    .catch(next);
});


// unpublish a post
router.get('/posts/unpublish/:id', auth.requireSession, function (req, res, next) {
  return Post.alter(parseInt(req.params.id, 10), { is_published: false })
    .then(post => {
      return res.redirect('/admin');
    })
    .catch(next);
});


// delete a file or folder
router.get('/files/delete/*', function (req, res, next) {
  const target = decodeURIComponent(req.path).replace(/^\/files\/delete\//, ''),
        dir = target.split('/').slice(1, -1).pop() || '';

  // files
  if (/\./.test(target)) {
    unlink('public/' + target)
      .then(() => {
        return res.redirect('/admin/files/' + dir);
      })
      .catch(next);

  // directories
  } else {
    rmrf('public/' + target)
      .then(() => {
        return res.redirect('/admin/files/' + target.replace(/\/$/, '').split('/').slice(1, -1).join('/'));
      })
      .catch(next);
  }
});


// view files on disk in uploads directory
function getFiles(dir) {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webm'];

  function sortFilenames(a, b) {
    let aName = a.filename.toLowerCase(),
        bName = b.filename.toLowerCase();
    if (aName < bName) {
      return -1;
    } else if (aName > bName) {
      return 1;
    } else {
      return 0;
    }
  }

  return readdir(dir)
    .then(listing => {
      let files = [], folders = [];

      for (const entry of listing) {
        if (entry.substr(0, 1) !== '.') {
          if (fs.statSync(dir + '/' + entry).isDirectory()) {
            folders.push({
              filename: entry
            });
          } else {
            files.push({
              filename: entry,
              isImage: imageExtensions.includes(entry.split('.').pop().toLowerCase())
            });
          }
        }
      }

      files.sort(sortFilenames);
      folders.sort(sortFilenames);

      return {
        files: files,
        folders: folders
      };
    })
    .catch(err => {
      return {
        files: [],
        folders: []
      };
    });
}

router.get('/files/?*', function (req, res, next) {
  const uploadsDir = 'public/uploads',
        uploadsUrl = '/uploads',
        subpath = decodeURIComponent(req.path.replace(/^\/files\/?/, '')).replace(/\/$/, '');
  let parentPath = null;

  if (subpath) {
    parentPath = '/admin/files/' + subpath.split('/').slice(0,-1).join('/');
  }

  getFiles([uploadsDir, subpath].filter(el => !!el).join('/'))
    .then(result => {
      return res.render('../views/admin/files.twig', {
        files: result.files,
        folders: result.folders,
        // base path for clickable subfolders
        folderPath: (req.originalUrl + '/').replace(/\/\/$/, '/'),
        // base path for image previews
        filePath: [uploadsUrl, subpath].filter(el => !!el).join('/') + '/',
        // path for 'up one level' links
        parentPath: parentPath
      });
    })
    .catch(next);
});

// upload files or create folders
router.post('/files/?*', upload.array('files'), function (req, res, next) {
  const subpath = decodeURIComponent(req.path).replace(/^\/files\/?/, '').replace(/\/$/, ''),
        reservedNames = ['delete', 'files'];
  if (req.files) {
    Promise.all(req.files.map(file => rename(file.path, file.destination + subpath + (subpath ? '/' : '') + file.originalname)))
      .then(() => {
        return res.redirect('/admin/files/' + subpath);
      })
      .catch(next);
  } else if (req.body.folderName) {
    const name = req.body.folderName.replace(/[\/\.:,]/g, '').trim();
    if (name && !reservedNames.includes(name.toLowerCase())) {
      mkdir('public/uploads/' + subpath + '/' + name)
        .then(() => {
          return res.redirect('/admin/files/' + subpath);
        })
        .catch(next);
    } else {
      return res.redirect('/admin/files/' + subpath);
    }
  } else {
    return res.redirect('/admin/files/' + subpath);
  }
});


module.exports = router;
