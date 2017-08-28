var TDW = (function (window, document) {

    'use strict';


    /* helper functions
     * ================
     */

    // cast to array, because _.toArray and _.castArray are inadequate when
    // the argument could be either a node or nodeList. Also doubles as
    // an array copier
    function toArray(collection) {
        var result = [];
        if (collection) {
            if (typeof collection.length === 'number') {
                for (var i = 0; i < collection.length; i++) {
                    result.push(collection[i]);
                }
            } else {
                result.push(collection);
            }
        }
        return result;
    }

    // quick xhr
    function xhr(params) {
        params = _.assign({
            method: 'GET',
            data: null,
            success: null,
            before: null,
            after: null
        }, params);

        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && typeof params.success === 'function') {
                params.success(xhr);
            }
        }
        xhr.open(params.method, params.url);
        if (typeof params.before === 'function') {
            params.before(xhr);
        }
        xhr.send(params.data);
        if (typeof params.after === 'function') {
            params.after(xhr);
        }
    }


    /* toggles
     * =======
     *
     * a one-to-many class toggler activated on click
     *
     * default elements:
     * <el data-toggle-target="[keyword|selector]" />
     */

    var toggles = (function () {
        var toggleList = [],

            togglePrototype = {
                origin: null,
                targets: [],
                activeClass: 'is-active',

                // make toggle go
                activate: function activate(force) {
                    _.forEach([this.origin].concat(this.targets), function (el) {
                        if (typeof force === 'boolean') {
                            el.classList.toggle(this.activeClass, force);
                        } else {
                            el.classList.toggle(this.activeClass);
                        }
                    }.bind(this));
                    if (typeof this.onActivate === 'function') {
                        this.onActivate(this);
                    }
                    return this;
                },

                // get targets and add event listeners
                init: function init() {
                    if (!this.targets || this.targets.length === 0) {
                        this.targets = findTargets(this.origin);
                    } else {
                        // make sure we've got an array of targets
                        this.targets = toArray(this.targets);
                    }
                    this.origin.addEventListener('click', function (ev) {
                        ev.preventDefault();
                        this.activate();
                    }.bind(this));
                    if (typeof this.onInit === 'function') {
                        this.onInit(this);
                    }
                    return this;
                },

                // optional callbacks
                onActivate: null,
                onInit: null
            };

        // private: parses a target string and returns a matching array
        function findTargets(el) {
            var targetString = el.getAttribute('data-toggle-target');
            if (!targetString) {
                return [];
            } else if (targetString === 'next') {
                return [el.nextElementSibling];
            } else if (targetString === 'parent') {
                return [el.parentNode];
            } else if (targetString === 'parentnext') {
                return [el.parentNode.nextElementSibling];
            } else if (targetString === 'parentparentnext') {
                return [el.parentNode.parentNode.nextElementSibling];
            }
            return toArray(document.querySelectorAll(targetString));
        }

        // public: make node or nodeList toggleable
        function add(els, options) {
            options = options || {};
            els = toArray(els);
            _.forEach(els, function (el) {
                var toggle = _.assign(Object.create(togglePrototype), { origin: el }, options);
                toggleList.push(toggle);
                toggle.init();
            });
            return list();
        }

        // public: returns an array of all toggles on the page
        function list() {
            return toggleList;
        }

        // public: returns all toggle objects whose origins match a given css selector
        function find(selector) {
            var result = [];
            _.forEach(list(), function (toggle) {
                if (toggle.origin.matches(selector)) {
                    result.push(toggle);
                }
            });
            return result;
        }

        // public: returns a single toggle object whose origin matches a given css selector
        function get(selector) {
            var result = null;
            _.forEach(list(), function (toggle) {
                if (toggle.origin.matches(selector)) {
                    result = toggle;
                    return false;
                }
            });
            return result;
        }

        // public: initialize by adding default elements
        function init() {
            add(document.querySelectorAll('[data-toggle-target]'));
        }

        return {
            add: add,
            list: list,
            find: find,
            get: get,
            init: init
        };
    }());


    /* shared heights
     * ==============
     *
     * match heights between unrelated elements
     *
     * default elements:
     * <el data-height-group="groupname" />
     */

    var sharedHeights = (function () {
        var heightGroups = {};

        // public: update all shared-height elements
        function update() {
            var g, thisGroup, heights, maxHeight;

            function resetHeight(el) {
                el.style.minHeight = 0;
                heights.push(el.offsetHeight);
            }
            function applyHeight(el) {
                el.style.minHeight = maxHeight + 'px';
            }

            for (g in heightGroups) {
                if (heightGroups.hasOwnProperty(g)) {
                    thisGroup = heightGroups[g];
                    heights = [];
                    _.forEach(thisGroup, resetHeight);
                    maxHeight = Math.max.apply(null, heights);
                    _.forEach(thisGroup, applyHeight);
                }
            }
        }

        // public: add shared-height functionality to a node or nodelist
        function add(els, groupName) {
            _.forEach(toArray(els), function (el) {
                var group = groupName || el.getAttribute('data-height-group');
                if (!group) {
                    console.warn('No group specified for shared-height element');
                    return false;
                }
                heightGroups[group] = heightGroups[group] || [];
                heightGroups[group].push(el);
            });
            return list();
        }

        // public: return heightGroups object
        function list() {
            return heightGroups;
        }

        // public: initialize with default elements
        function init() {
            add(document.querySelectorAll('[data-height-group]'));
            update();
        }

        var debouncedUpdate = _.debounce(update, 75);
        window.addEventListener('resize', debouncedUpdate);

        return {
            add: add,
            list: list,
            update: update,
            init: init
        };
    }());


    /* range input enhancements
     * ========================
     */

    var ranges = (function () {

        // output range values to element
        // <output for="range-input-id"></output>
        function registerLabels() {
            _.forEach(document.querySelectorAll('output[for]'), function (output) {
                var input = document.getElementById(output.getAttribute('for'));
                if (input && input.tagName.toLowerCase() === 'input' && input.type.toLowerCase() === 'range') {
                    updateLabel(input, output);
                    input.addEventListener('input', function (ev) {
                        updateLabel(input, output);
                    });
                }
            });
        }
        function updateLabel(input, output) {
            if (input.min && input.value === input.min && input.getAttribute('data-min-label')) {
                output.textContent = input.getAttribute('data-min-label');
            } else if (input.max && input.value === input.max && input.getAttribute('data-max-label')) {
                output.textContent = input.getAttribute('data-max-label');
            } else if (input.getAttribute('data-unit')) {
                output.textContent = input.value + input.getAttribute('data-unit');
            } else {
                output.textContent = input.value;
            }
        }

        // create a facsimile of multiple range inputs via mutual constraints
        function constrain() {
            // lower bound inputs
            _.forEach(document.querySelectorAll('input[type="range"][data-min-constrain]'), function (constrainer) {
                var target = document.getElementById(constrainer.getAttribute('data-min-constrain')),
                    step = parseFloat(constrainer.step, 10) || 1,
                    max = parseFloat(constrainer.max, 10) || 100,
                    label = document.querySelector('output[for="' + target.id + '"]');
                if (target && target.tagName.toLowerCase() === 'input' && target.type.toLowerCase() === 'range') {
                    constrainer.addEventListener('input', function (ev) {
                        var cVal = parseFloat(constrainer.value, 10),
                            tVal = parseFloat(target.value, 10);
                        if (cVal > tVal) {
                            target.value = Math.min(cVal + step, max);
                            triggerChangeEvent(target);
                            if (label) {
                                updateLabel(target, label);
                            }
                        }
                    });
                }
            });
            // upper bound inputs
            _.forEach(document.querySelectorAll('input[type="range"][data-max-constrain]'), function (constrainer) {
                var target = document.getElementById(constrainer.getAttribute('data-max-constrain')),
                    step = parseFloat(constrainer.step, 10) || 1,
                    min = parseFloat(constrainer.min, 10) || 0,
                    label = document.querySelector('output[for="' + target.id + '"]');
                if (target && target.tagName.toLowerCase() === 'input' && target.type.toLowerCase() === 'range') {
                    constrainer.addEventListener('input', function (ev) {
                        var cVal = parseFloat(constrainer.value, 10),
                            tVal = parseFloat(target.value, 10);
                        if (cVal < tVal) {
                            target.value = Math.max(cVal - step, min);
                            triggerChangeEvent(target);
                            if (label) {
                                updateLabel(target, label);
                            }
                        }
                    });
                }
            });
            // trigger change event
            // thanks to https://stackoverflow.com/questions/2856513/how-can-i-trigger-an-onchange-event-manually
            function triggerChangeEvent(el) {
                if ("createEvent" in document) {
                    var ev = document.createEvent("HTMLEvents");
                    ev.initEvent("change", false, true);
                    el.dispatchEvent(ev);
                } else {
                    el.fireEvent("onchange");
                }
            }
        }

        return {
            registerLabels: registerLabels,
            constrain: constrain
        }
    }());


    /* list ajax updater
     * =================
     *
     * no need to reload the whole page for list filtering
     */

    var listUpdater = (function () {

        var listenerElements = '.list-filters__choice > a, .list-active-filters a';

        // send the request and update relevant areas with response
        function getList(url) {
            var containers = ['list-active-filters', 'list-link-filters', 'article-list'],
                tmp = document.createElement('div');

            xhr({
                url: url,
                success: function (xhr) {
                    tmp.innerHTML = xhr.responseText;
                    _.forEach(containers, function (container) {
                        var target = document.getElementById(container),
                            newHTML = tmp.querySelector('#' + container);
                        if (target && newHTML) {
                            target.innerHTML = newHTML.innerHTML;
                            // re-bind ajax behavior to fresh links
                            bindClicks(target.querySelectorAll(listenerElements));
                        }
                    });
                    window.history.pushState('', '', url);
                    misc.enhanceFilterSentences();
                }
            });
        }

        function bindClicks(els) {
            _.forEach(els, function (el) {
                el.addEventListener('click', function (ev) {
                    ev.preventDefault();
                    getList(el.href);
                });
            });
        }

        function bindRanges(els) {
            _.forEach(els, function (el) {
                el.addEventListener('change', _.throttle(function (ev) {
                    var urlParams = location.search.substring(1),
                        paramsObj = {},
                        paramsList = [];
                    if (urlParams) {
                        paramsObj = JSON.parse('{"' + decodeURI(urlParams).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}');
                    }

                    paramsObj[el.name] = el.value;
                    for (var key in paramsObj) {
                        if (paramsObj.hasOwnProperty(key)) {
                            paramsList.push(encodeURI(key) + '=' + encodeURI(paramsObj[key]));
                        }
                    }

                    getList(window.location.pathname + '?' + paramsList.join('&'));
                }, 200));
            });
        }

        function init() {
            bindClicks(document.querySelectorAll(listenerElements));
            bindRanges(document.querySelectorAll('.list-filters input[type="range"]'));

        }

        return {
            init: init
        };

    })();


    /* forms
     * =====
     *
     * several small form enhancements
     */

    var forms = (function () {

        // allow visual focus and selection indicators of input labels
        var focusLabels = function () {
            _.forEach(document.querySelectorAll('label[for]'), function (label) {
                var input = document.getElementById(label.getAttribute('for'));
                if (input) {
                    input.addEventListener('focus', function (ev) {
                        label.classList.add('is-focused');
                    });
                    input.addEventListener('blur', function (ev) {
                        label.classList.remove('is-focused');
                    });
                    if (input.type.toLowerCase() === 'radio' || input.type.toLowerCase() === 'checkbox') {
                        input.addEventListener('change', function (ev) {
                            if (input.checked) {
                                label.classList.add('is-selected');
                            } else {
                                label.classList.remove('is-selected');
                            }
                        });
                    }
                    // trigger 'change' event manually in order to populate highlight states on page load
                    if ("createEvent" in document) {
                        var ev = document.createEvent("HTMLEvents");
                        ev.initEvent("change", false, true);
                        input.dispatchEvent(ev);
                    } else {
                        input.fireEvent("onchange");
                    }
                }
            });
        };

        // visualize automatic slug generation
        var generateSlugs = function () {
            function slugify(sources) {
                var plaintext = '';
                _.forEach(sources, function (source) {
                    plaintext += source.value + ' ';
                });
                return plaintext.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
            }

            _.forEach(document.querySelectorAll('[data-generate-slug-from]'), function (slugInput) {
                var sources = document.querySelectorAll(slugInput.getAttribute('data-generate-slug-from'));

                // on source change
                _.forEach(sources, function (source) {
                    source.addEventListener('input', function (ev) {
                        slugInput.setAttribute('placeholder', slugify(sources));
                    });
                });

                // on load
                slugInput.setAttribute('placeholder', slugify(sources));
            });
        };

        // generate automatic markdown previews
        var generateMarkdownPreviews = function () {
            function getPreview(markdown, target) {
                xhr({
                    method: 'POST',
                    url: '/utility/markdown',
                    data: 'markdownContent=' + markdown,
                    before: function (xhr) {
                        xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                    },
                    success: function (xhr) {
                        target.innerHTML = xhr.responseText;
                        misc.createTableOfContents();
                        misc.nudgeArticleFigures();
                    }
                })
            }

            _.forEach(document.querySelectorAll('textarea[data-markdown-preview]'), function (source) {
                var target = document.getElementById(source.getAttribute('data-markdown-preview'));

                // initial load
                getPreview(source.value, target);

                // debounced listener
                source.addEventListener('input', _.debounce(function (ev) {
                    getPreview(ev.target.value, target);
                }, 500));

            });
        };

        // resizing textareas
        var resizeTextareas = function () {
            function copyStyles(source, target) {
                var styles = window.getComputedStyle(source, null),
                    relevantStyles = ['width', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontKerning', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'whiteSpace', 'hyphens'];

                _.forEach(relevantStyles, function (style) {
                    target.style[style] = styles[style];
                });
            }

            function mirrorSize(textarea, ref) {
                ref.textContent = textarea.value + '\u00a0';  // nbsp to size new lines correctly
                textarea.style.minHeight = ref.clientHeight + 'px';
            }

            _.forEach(document.getElementsByTagName('textarea'), function (textarea) {
                var ref = document.createElement('div');
                ref.className = 'textarea-size-reference';

                copyStyles(textarea, ref);
                window.setTimeout(function () {
                    mirrorSize(textarea, ref);
                }, 0);

                textarea.addEventListener('input', function (ev) {
                    mirrorSize(textarea, ref);
                });
                window.addEventListener('resize', _.debounce(function () {
                    copyStyles(textarea, ref);
                    mirrorSize(textarea, ref);
                }, 200));

                document.body.appendChild(ref);
            });
        };

        // enhance multi-select inputs with dedicated UI
        var enhanceMultiSelects = function () {
            var scaffold = '' +
                    '<div class="multi-select__actives">' +
                    '</div>' +
                    '<button type="button" class="button button--small multi-select__add" data-toggle-target="next">Add</button>' +
                    '<div class="multi-select__modal">' +
                        '<div class="multi-select__options">' +
                        '</div>' +
                        '<button type="button" class="button button--small multi-select__close" data-toggle-target="parent">Done</button>' +
                    '</div>',
                selectedElTemplate = document.createElement('button'),
                optionElTemplate = document.createElement('button'),
                noSelectionTemplate = document.createElement('p');

            selectedElTemplate.setAttribute('type', 'button');
            selectedElTemplate.className = 'multi-select__active';

            optionElTemplate.setAttribute('type', 'button');
            optionElTemplate.className = 'multi-select__option';

            noSelectionTemplate.className = 'multi-select__none';
            noSelectionTemplate.textContent = 'None selected';

            _.forEach(document.querySelectorAll('select[multiple]'), function (select) {
                var options = select.children,
                    container = document.createElement('div'),
                    activesContainer, optionsContainer;

                container.className = 'multi-select';

                // stamp our scaffold markup
                container.innerHTML = scaffold;
                select.parentNode.insertBefore(container, select);

                activesContainer = container.querySelector('.multi-select__actives');
                optionsContainer = container.querySelector('.multi-select__options');

                // create representations of each option in the list
                _.forEach(options, function (option) {
                    var optionEl = optionElTemplate.cloneNode(true),
                        selectedEl = selectedElTemplate.cloneNode(true);

                    optionEl.textContent = option.textContent;
                    selectedEl.textContent = option.textContent;

                    // reflect initial state on page load
                    if (option.selected) {
                        optionEl.classList.add('is-selected');
                        selectedEl.classList.add('is-active');
                    }

                    optionsContainer.appendChild(optionEl);
                    activesContainer.appendChild(selectedEl);

                    // clicking an option in the options list toggles selection
                    optionEl.addEventListener('click', function (ev) {
                        this.classList.toggle('is-selected');
                        if (this.classList.contains('is-selected')) {
                            selectedEl.classList.add('is-active');
                            option.selected = true;
                        } else {
                            selectedEl.classList.remove('is-active');
                            option.selected = false;
                        }
                    });

                    // clicking a selected tag de-selects it
                    selectedEl.addEventListener('click', function (ev) {
                        this.classList.remove('is-active');
                        optionEl.classList.remove('is-selected');
                        option.selected = false;
                    });
                });

                activesContainer.appendChild(noSelectionTemplate.cloneNode(true));

                select.classList.add('is-enhanced');
            });
        };

        return {
            focusLabels: focusLabels,
            generateSlugs: generateSlugs,
            generateMarkdownPreviews: generateMarkdownPreviews,
            resizeTextareas: resizeTextareas,
            enhanceMultiSelects: enhanceMultiSelects
        };
    })();


    /* misc
     * ====
     *
     * miscellaneous small enhancements
     */

    var misc = (function () {

        // gradiate background colors of lists of article cards
        var blendListColors = function () {
            var color1 = [2, 63, 37],
                color2 = [0, 85, 93];
            _.forEach(document.getElementsByClassName('article-list'), function (list) {
                var cards = list.querySelectorAll('.article-card'),
                    steps = color1.map(function (__, i) {
                        return (color1[i] - color2[i]) / cards.length
                    });
                _.forEach(cards, function (card, i) {
                    var thisColor = steps.map(function (step, j) {
                        return color1[j] - step * i;
                    });
                    card.style.backgroundColor = 'rgb(' + thisColor.join(',') + ')';
                });
            });
        };

        // only overhang review figures if review stats wouldn't be in the way
        var nudgeArticleFigures = function () {
            var stats = document.querySelector('.review-stats'),
                figures = document.querySelectorAll('.text-copy figure'),
                lowestStat;

            function update() {
                var cutoff = lowestStat.getBoundingClientRect().y + lowestStat.offsetHeight;
                _.forEach(figures, function (figure) {
                    figure.classList.remove('can-nudge');
                    if (figure.getBoundingClientRect().y > cutoff) {
                        figure.classList.add('can-nudge');
                    }
                });
            }

            if (figures.length > 0) {
                // if stats exist, do calculations
                if (stats) {
                    lowestStat = stats.lastElementChild;
                    update();
                    window.addEventListener('resize', _.throttle(update, 100));

                // otherwise, everything's good to go
                } else {
                    _.forEach(figures, function (figure) {
                        figure.classList.add('can-nudge');
                    });
                }
            }
        };

        // create tables of contents for articles based on headings in the body copy
        var createTableOfContents = function () {
            _.forEach(document.getElementsByClassName('text-copy'), function (container) {
                var subheadings = container.querySelectorAll('h2'),
                    tocContainer;
                if (subheadings.length > 0) {
                    tocContainer = document.createElement('div');
                    tocContainer.className = 'text-contents';
                    tocContainer.innerHTML = '<span class="text-contents__label">Contents:</span>';
                    _.forEach(subheadings, function (subheading) {
                        var id = subheading.textContent.trim().toLowerCase().replace(/\W/g, ''),
                            link = document.createElement('a');
                        subheading.id = id;
                        link.href = '#' + id;
                        link.textContent = subheading.textContent;
                        tocContainer.appendChild(link);
                    });
                    container.insertBefore(tocContainer, container.firstChild);
                }
            });
        };

        // enhance markup of images outputted from markdown
        var createFigureMarkup = function () {
            _.forEach(document.getElementsByClassName('text-copy'), function (container) {
                _.forEach(container.querySelectorAll('img'), function (image) {
                    if (image.alt && image.alt.trim().length > 0) {
                        var figure = document.createElement('figure'),
                            caption = document.createElement('figcaption'),
                            referenceEl, tmpParent;

                        // un-nest images from paragraphs (created via markdown)
                        if (image.parentNode.tagName.toLowerCase() === 'p') {
                            tmpParent = image.parentNode;
                            referenceEl = tmpParent.previousElementSibling;
                            tmpParent.parentNode.removeChild(tmpParent);
                        } else {
                            referenceEl = image.previousElementSibling;
                        }

                        figure.appendChild(image);
                        figure.appendChild(caption);
                        caption.textContent = image.alt;
                        referenceEl.parentElement.insertBefore(figure, referenceEl);
                    }
                });
            });
        };

        // make filter summary sentences more natural-sounding
        var enhanceFilterSentences = function () {
            var comma = document.createElement('span'),
                and = document.createTextNode(' and ');
            comma.textContent = ', ';
            comma.className = 'unkerned-punctuation';
            _.forEach(document.getElementsByClassName('list-active-filters'), function (container) {
                var clauses = container.querySelectorAll('.list-active-filters__clause');

                // 3 or more parts goes to list style, e.g.:
                // "thing 1, thing 2, and thing 3"
                // you'll pry my oxford comma from my cold, dead hands
                if (clauses.length >= 3) {
                    _.forEach(clauses, function (clause, i) {
                        if (i === clauses.length - 1) {
                            clause.insertBefore(and.cloneNode(true), clause.firstChild);
                        }
                        if (i !== 0) {
                            clause.insertBefore(comma.cloneNode(true), clause.firstChild);
                        }
                    });

                // 2 or more parts means just a simple "and" between them
                } else if (clauses.length === 2) {
                    clauses[1].insertBefore(and.cloneNode(true), clauses[1].firstChild);
                }
            });
        };

        // confirm deletion of items
        var confirmDeletions = function () {
            _.forEach(document.getElementsByClassName('confirm-delete'), function (el) {
                el.addEventListener('click', function (ev) {
                    if (!confirm('Really delete?')) {
                        ev.preventDefault();
                        return false;
                    }
                });
            });
        };

        return {
            blendListColors: blendListColors,
            nudgeArticleFigures: nudgeArticleFigures,
            createTableOfContents: createTableOfContents,
            createFigureMarkup: createFigureMarkup,
            enhanceFilterSentences: enhanceFilterSentences,
            confirmDeletions: confirmDeletions
        };
    })();


    /* initialization
     * ==============
     */

    var init = function () {
        var skrollable = skrollr.init({
            smoothScrolling: false,
            mobileCheck: function () { return false; },
            forceHeight: false
        });

        forms.enhanceMultiSelects();

        toggles.init();
        sharedHeights.init();
        ranges.registerLabels();
        ranges.constrain();
        listUpdater.init();

        misc.enhanceFilterSentences();
        misc.createTableOfContents();
        misc.createFigureMarkup();
        misc.nudgeArticleFigures();
        misc.blendListColors();
        misc.confirmDeletions();

        forms.focusLabels();
        forms.resizeTextareas();
        forms.generateSlugs();
        forms.generateMarkdownPreviews();

        document.documentElement.classList.remove('no-js');
        document.documentElement.classList.add('js');
    };


    /* public
     * ======
     */

    return {
        toggles: toggles,
        sharedHeights: sharedHeights,
        init: init
    };

}(window, document));

/*! skrollr 0.6.30 (2015-08-12) | Alexander Prinzhorn - https://github.com/Prinzhorn/skrollr | Free to use under terms of MIT license */
!function(a,b,c){"use strict";function d(c){if(e=b.documentElement,f=b.body,T(),ha=this,c=c||{},ma=c.constants||{},c.easing)for(var d in c.easing)W[d]=c.easing[d];ta=c.edgeStrategy||"set",ka={beforerender:c.beforerender,render:c.render,keyframe:c.keyframe},la=c.forceHeight!==!1,la&&(Ka=c.scale||1),na=c.mobileDeceleration||y,pa=c.smoothScrolling!==!1,qa=c.smoothScrollingDuration||A,ra={targetTop:ha.getScrollTop()},Sa=(c.mobileCheck||function(){return/Android|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent||navigator.vendor||a.opera)})(),Sa?(ja=b.getElementById(c.skrollrBody||z),ja&&ga(),X(),Ea(e,[s,v],[t])):Ea(e,[s,u],[t]),ha.refresh(),wa(a,"resize orientationchange",function(){var a=e.clientWidth,b=e.clientHeight;(b!==Pa||a!==Oa)&&(Pa=b,Oa=a,Qa=!0)});var g=U();return function h(){$(),va=g(h)}(),ha}var e,f,g={get:function(){return ha},init:function(a){return ha||new d(a)},VERSION:"0.6.30"},h=Object.prototype.hasOwnProperty,i=a.Math,j=a.getComputedStyle,k="touchstart",l="touchmove",m="touchcancel",n="touchend",o="skrollable",p=o+"-before",q=o+"-between",r=o+"-after",s="skrollr",t="no-"+s,u=s+"-desktop",v=s+"-mobile",w="linear",x=1e3,y=.004,z="skrollr-body",A=200,B="start",C="end",D="center",E="bottom",F="___skrollable_id",G=/^(?:input|textarea|button|select)$/i,H=/^\s+|\s+$/g,I=/^data(?:-(_\w+))?(?:-?(-?\d*\.?\d+p?))?(?:-?(start|end|top|center|bottom))?(?:-?(top|center|bottom))?$/,J=/\s*(@?[\w\-\[\]]+)\s*:\s*(.+?)\s*(?:;|$)/gi,K=/^(@?[a-z\-]+)\[(\w+)\]$/,L=/-([a-z0-9_])/g,M=function(a,b){return b.toUpperCase()},N=/[\-+]?[\d]*\.?[\d]+/g,O=/\{\?\}/g,P=/rgba?\(\s*-?\d+\s*,\s*-?\d+\s*,\s*-?\d+/g,Q=/[a-z\-]+-gradient/g,R="",S="",T=function(){var a=/^(?:O|Moz|webkit|ms)|(?:-(?:o|moz|webkit|ms)-)/;if(j){var b=j(f,null);for(var c in b)if(R=c.match(a)||+c==c&&b[c].match(a))break;if(!R)return void(R=S="");R=R[0],"-"===R.slice(0,1)?(S=R,R={"-webkit-":"webkit","-moz-":"Moz","-ms-":"ms","-o-":"O"}[R]):S="-"+R.toLowerCase()+"-"}},U=function(){var b=a.requestAnimationFrame||a[R.toLowerCase()+"RequestAnimationFrame"],c=Ha();return(Sa||!b)&&(b=function(b){var d=Ha()-c,e=i.max(0,1e3/60-d);return a.setTimeout(function(){c=Ha(),b()},e)}),b},V=function(){var b=a.cancelAnimationFrame||a[R.toLowerCase()+"CancelAnimationFrame"];return(Sa||!b)&&(b=function(b){return a.clearTimeout(b)}),b},W={begin:function(){return 0},end:function(){return 1},linear:function(a){return a},quadratic:function(a){return a*a},cubic:function(a){return a*a*a},swing:function(a){return-i.cos(a*i.PI)/2+.5},sqrt:function(a){return i.sqrt(a)},outCubic:function(a){return i.pow(a-1,3)+1},bounce:function(a){var b;if(.5083>=a)b=3;else if(.8489>=a)b=9;else if(.96208>=a)b=27;else{if(!(.99981>=a))return 1;b=91}return 1-i.abs(3*i.cos(a*b*1.028)/b)}};d.prototype.refresh=function(a){var d,e,f=!1;for(a===c?(f=!0,ia=[],Ra=0,a=b.getElementsByTagName("*")):a.length===c&&(a=[a]),d=0,e=a.length;e>d;d++){var g=a[d],h=g,i=[],j=pa,k=ta,l=!1;if(f&&F in g&&delete g[F],g.attributes){for(var m=0,n=g.attributes.length;n>m;m++){var p=g.attributes[m];if("data-anchor-target"!==p.name)if("data-smooth-scrolling"!==p.name)if("data-edge-strategy"!==p.name)if("data-emit-events"!==p.name){var q=p.name.match(I);if(null!==q){var r={props:p.value,element:g,eventType:p.name.replace(L,M)};i.push(r);var s=q[1];s&&(r.constant=s.substr(1));var t=q[2];/p$/.test(t)?(r.isPercentage=!0,r.offset=(0|t.slice(0,-1))/100):r.offset=0|t;var u=q[3],v=q[4]||u;u&&u!==B&&u!==C?(r.mode="relative",r.anchors=[u,v]):(r.mode="absolute",u===C?r.isEnd=!0:r.isPercentage||(r.offset=r.offset*Ka))}}else l=!0;else k=p.value;else j="off"!==p.value;else if(h=b.querySelector(p.value),null===h)throw'Unable to find anchor target "'+p.value+'"'}if(i.length){var w,x,y;!f&&F in g?(y=g[F],w=ia[y].styleAttr,x=ia[y].classAttr):(y=g[F]=Ra++,w=g.style.cssText,x=Da(g)),ia[y]={element:g,styleAttr:w,classAttr:x,anchorTarget:h,keyFrames:i,smoothScrolling:j,edgeStrategy:k,emitEvents:l,lastFrameIndex:-1},Ea(g,[o],[])}}}for(Aa(),d=0,e=a.length;e>d;d++){var z=ia[a[d][F]];z!==c&&(_(z),ba(z))}return ha},d.prototype.relativeToAbsolute=function(a,b,c){var d=e.clientHeight,f=a.getBoundingClientRect(),g=f.top,h=f.bottom-f.top;return b===E?g-=d:b===D&&(g-=d/2),c===E?g+=h:c===D&&(g+=h/2),g+=ha.getScrollTop(),g+.5|0},d.prototype.animateTo=function(a,b){b=b||{};var d=Ha(),e=ha.getScrollTop(),f=b.duration===c?x:b.duration;return oa={startTop:e,topDiff:a-e,targetTop:a,duration:f,startTime:d,endTime:d+f,easing:W[b.easing||w],done:b.done},oa.topDiff||(oa.done&&oa.done.call(ha,!1),oa=c),ha},d.prototype.stopAnimateTo=function(){oa&&oa.done&&oa.done.call(ha,!0),oa=c},d.prototype.isAnimatingTo=function(){return!!oa},d.prototype.isMobile=function(){return Sa},d.prototype.setScrollTop=function(b,c){return sa=c===!0,Sa?Ta=i.min(i.max(b,0),Ja):a.scrollTo(0,b),ha},d.prototype.getScrollTop=function(){return Sa?Ta:a.pageYOffset||e.scrollTop||f.scrollTop||0},d.prototype.getMaxScrollTop=function(){return Ja},d.prototype.on=function(a,b){return ka[a]=b,ha},d.prototype.off=function(a){return delete ka[a],ha},d.prototype.destroy=function(){var a=V();a(va),ya(),Ea(e,[t],[s,u,v]);for(var b=0,d=ia.length;d>b;b++)fa(ia[b].element);e.style.overflow=f.style.overflow="",e.style.height=f.style.height="",ja&&g.setStyle(ja,"transform","none"),ha=c,ja=c,ka=c,la=c,Ja=0,Ka=1,ma=c,na=c,La="down",Ma=-1,Oa=0,Pa=0,Qa=!1,oa=c,pa=c,qa=c,ra=c,sa=c,Ra=0,ta=c,Sa=!1,Ta=0,ua=c};var X=function(){var d,g,h,j,o,p,q,r,s,t,u,v;wa(e,[k,l,m,n].join(" "),function(a){var e=a.changedTouches[0];for(j=a.target;3===j.nodeType;)j=j.parentNode;switch(o=e.clientY,p=e.clientX,t=a.timeStamp,G.test(j.tagName)||a.preventDefault(),a.type){case k:d&&d.blur(),ha.stopAnimateTo(),d=j,g=q=o,h=p,s=t;break;case l:G.test(j.tagName)&&b.activeElement!==j&&a.preventDefault(),r=o-q,v=t-u,ha.setScrollTop(Ta-r,!0),q=o,u=t;break;default:case m:case n:var f=g-o,w=h-p,x=w*w+f*f;if(49>x){if(!G.test(d.tagName)){d.focus();var y=b.createEvent("MouseEvents");y.initMouseEvent("click",!0,!0,a.view,1,e.screenX,e.screenY,e.clientX,e.clientY,a.ctrlKey,a.altKey,a.shiftKey,a.metaKey,0,null),d.dispatchEvent(y)}return}d=c;var z=r/v;z=i.max(i.min(z,3),-3);var A=i.abs(z/na),B=z*A+.5*na*A*A,C=ha.getScrollTop()-B,D=0;C>Ja?(D=(Ja-C)/B,C=Ja):0>C&&(D=-C/B,C=0),A*=1-D,ha.animateTo(C+.5|0,{easing:"outCubic",duration:A})}}),a.scrollTo(0,0),e.style.overflow=f.style.overflow="hidden"},Y=function(){var a,b,c,d,f,g,h,j,k,l,m,n=e.clientHeight,o=Ba();for(j=0,k=ia.length;k>j;j++)for(a=ia[j],b=a.element,c=a.anchorTarget,d=a.keyFrames,f=0,g=d.length;g>f;f++)h=d[f],l=h.offset,m=o[h.constant]||0,h.frame=l,h.isPercentage&&(l*=n,h.frame=l),"relative"===h.mode&&(fa(b),h.frame=ha.relativeToAbsolute(c,h.anchors[0],h.anchors[1])-l,fa(b,!0)),h.frame+=m,la&&!h.isEnd&&h.frame>Ja&&(Ja=h.frame);for(Ja=i.max(Ja,Ca()),j=0,k=ia.length;k>j;j++){for(a=ia[j],d=a.keyFrames,f=0,g=d.length;g>f;f++)h=d[f],m=o[h.constant]||0,h.isEnd&&(h.frame=Ja-h.offset+m);a.keyFrames.sort(Ia)}},Z=function(a,b){for(var c=0,d=ia.length;d>c;c++){var e,f,i=ia[c],j=i.element,k=i.smoothScrolling?a:b,l=i.keyFrames,m=l.length,n=l[0],s=l[l.length-1],t=k<n.frame,u=k>s.frame,v=t?n:s,w=i.emitEvents,x=i.lastFrameIndex;if(t||u){if(t&&-1===i.edge||u&&1===i.edge)continue;switch(t?(Ea(j,[p],[r,q]),w&&x>-1&&(za(j,n.eventType,La),i.lastFrameIndex=-1)):(Ea(j,[r],[p,q]),w&&m>x&&(za(j,s.eventType,La),i.lastFrameIndex=m)),i.edge=t?-1:1,i.edgeStrategy){case"reset":fa(j);continue;case"ease":k=v.frame;break;default:case"set":var y=v.props;for(e in y)h.call(y,e)&&(f=ea(y[e].value),0===e.indexOf("@")?j.setAttribute(e.substr(1),f):g.setStyle(j,e,f));continue}}else 0!==i.edge&&(Ea(j,[o,q],[p,r]),i.edge=0);for(var z=0;m-1>z;z++)if(k>=l[z].frame&&k<=l[z+1].frame){var A=l[z],B=l[z+1];for(e in A.props)if(h.call(A.props,e)){var C=(k-A.frame)/(B.frame-A.frame);C=A.props[e].easing(C),f=da(A.props[e].value,B.props[e].value,C),f=ea(f),0===e.indexOf("@")?j.setAttribute(e.substr(1),f):g.setStyle(j,e,f)}w&&x!==z&&("down"===La?za(j,A.eventType,La):za(j,B.eventType,La),i.lastFrameIndex=z);break}}},$=function(){Qa&&(Qa=!1,Aa());var a,b,d=ha.getScrollTop(),e=Ha();if(oa)e>=oa.endTime?(d=oa.targetTop,a=oa.done,oa=c):(b=oa.easing((e-oa.startTime)/oa.duration),d=oa.startTop+b*oa.topDiff|0),ha.setScrollTop(d,!0);else if(!sa){var f=ra.targetTop-d;f&&(ra={startTop:Ma,topDiff:d-Ma,targetTop:d,startTime:Na,endTime:Na+qa}),e<=ra.endTime&&(b=W.sqrt((e-ra.startTime)/qa),d=ra.startTop+b*ra.topDiff|0)}if(sa||Ma!==d){La=d>Ma?"down":Ma>d?"up":La,sa=!1;var h={curTop:d,lastTop:Ma,maxTop:Ja,direction:La},i=ka.beforerender&&ka.beforerender.call(ha,h);i!==!1&&(Z(d,ha.getScrollTop()),Sa&&ja&&g.setStyle(ja,"transform","translate(0, "+-Ta+"px) "+ua),Ma=d,ka.render&&ka.render.call(ha,h)),a&&a.call(ha,!1)}Na=e},_=function(a){for(var b=0,c=a.keyFrames.length;c>b;b++){for(var d,e,f,g,h=a.keyFrames[b],i={};null!==(g=J.exec(h.props));)f=g[1],e=g[2],d=f.match(K),null!==d?(f=d[1],d=d[2]):d=w,e=e.indexOf("!")?aa(e):[e.slice(1)],i[f]={value:e,easing:W[d]};h.props=i}},aa=function(a){var b=[];return P.lastIndex=0,a=a.replace(P,function(a){return a.replace(N,function(a){return a/255*100+"%"})}),S&&(Q.lastIndex=0,a=a.replace(Q,function(a){return S+a})),a=a.replace(N,function(a){return b.push(+a),"{?}"}),b.unshift(a),b},ba=function(a){var b,c,d={};for(b=0,c=a.keyFrames.length;c>b;b++)ca(a.keyFrames[b],d);for(d={},b=a.keyFrames.length-1;b>=0;b--)ca(a.keyFrames[b],d)},ca=function(a,b){var c;for(c in b)h.call(a.props,c)||(a.props[c]=b[c]);for(c in a.props)b[c]=a.props[c]},da=function(a,b,c){var d,e=a.length;if(e!==b.length)throw"Can't interpolate between \""+a[0]+'" and "'+b[0]+'"';var f=[a[0]];for(d=1;e>d;d++)f[d]=a[d]+(b[d]-a[d])*c;return f},ea=function(a){var b=1;return O.lastIndex=0,a[0].replace(O,function(){return a[b++]})},fa=function(a,b){a=[].concat(a);for(var c,d,e=0,f=a.length;f>e;e++)d=a[e],c=ia[d[F]],c&&(b?(d.style.cssText=c.dirtyStyleAttr,Ea(d,c.dirtyClassAttr)):(c.dirtyStyleAttr=d.style.cssText,c.dirtyClassAttr=Da(d),d.style.cssText=c.styleAttr,Ea(d,c.classAttr)))},ga=function(){ua="translateZ(0)",g.setStyle(ja,"transform",ua);var a=j(ja),b=a.getPropertyValue("transform"),c=a.getPropertyValue(S+"transform"),d=b&&"none"!==b||c&&"none"!==c;d||(ua="")};g.setStyle=function(a,b,c){var d=a.style;if(b=b.replace(L,M).replace("-",""),"zIndex"===b)isNaN(c)?d[b]=c:d[b]=""+(0|c);else if("float"===b)d.styleFloat=d.cssFloat=c;else try{R&&(d[R+b.slice(0,1).toUpperCase()+b.slice(1)]=c),d[b]=c}catch(e){}};var ha,ia,ja,ka,la,ma,na,oa,pa,qa,ra,sa,ta,ua,va,wa=g.addEvent=function(b,c,d){var e=function(b){return b=b||a.event,b.target||(b.target=b.srcElement),b.preventDefault||(b.preventDefault=function(){b.returnValue=!1,b.defaultPrevented=!0}),d.call(this,b)};c=c.split(" ");for(var f,g=0,h=c.length;h>g;g++)f=c[g],b.addEventListener?b.addEventListener(f,d,!1):b.attachEvent("on"+f,e),Ua.push({element:b,name:f,listener:d})},xa=g.removeEvent=function(a,b,c){b=b.split(" ");for(var d=0,e=b.length;e>d;d++)a.removeEventListener?a.removeEventListener(b[d],c,!1):a.detachEvent("on"+b[d],c)},ya=function(){for(var a,b=0,c=Ua.length;c>b;b++)a=Ua[b],xa(a.element,a.name,a.listener);Ua=[]},za=function(a,b,c){ka.keyframe&&ka.keyframe.call(ha,a,b,c)},Aa=function(){var a=ha.getScrollTop();Ja=0,la&&!Sa&&(f.style.height=""),Y(),la&&!Sa&&(f.style.height=Ja+e.clientHeight+"px"),Sa?ha.setScrollTop(i.min(ha.getScrollTop(),Ja)):ha.setScrollTop(a,!0),sa=!0},Ba=function(){var a,b,c=e.clientHeight,d={};for(a in ma)b=ma[a],"function"==typeof b?b=b.call(ha):/p$/.test(b)&&(b=b.slice(0,-1)/100*c),d[a]=b;return d},Ca=function(){var a,b=0;return ja&&(b=i.max(ja.offsetHeight,ja.scrollHeight)),a=i.max(b,f.scrollHeight,f.offsetHeight,e.scrollHeight,e.offsetHeight,e.clientHeight),a-e.clientHeight},Da=function(b){var c="className";return a.SVGElement&&b instanceof a.SVGElement&&(b=b[c],c="baseVal"),b[c]},Ea=function(b,d,e){var f="className";if(a.SVGElement&&b instanceof a.SVGElement&&(b=b[f],f="baseVal"),e===c)return void(b[f]=d);for(var g=b[f],h=0,i=e.length;i>h;h++)g=Ga(g).replace(Ga(e[h])," ");g=Fa(g);for(var j=0,k=d.length;k>j;j++)-1===Ga(g).indexOf(Ga(d[j]))&&(g+=" "+d[j]);b[f]=Fa(g)},Fa=function(a){return a.replace(H,"")},Ga=function(a){return" "+a+" "},Ha=Date.now||function(){return+new Date},Ia=function(a,b){return a.frame-b.frame},Ja=0,Ka=1,La="down",Ma=-1,Na=Ha(),Oa=0,Pa=0,Qa=!1,Ra=0,Sa=!1,Ta=0,Ua=[];"function"==typeof define&&define.amd?define([],function(){return g}):"undefined"!=typeof module&&module.exports?module.exports=g:a.skrollr=g}(window,document);

TDW.init();
