angular.module('jm.i18next', ['ng']);
angular.module('jm.i18next').provider('$i18next', function () {

	'use strict';

	var self = this,
		/**
		 * This will be our translation function (see code below)
		 */
		t = null,
		translations = {},
		optionsObj;

	self.options = {};

	self.$get = ['$rootScope', function ($rootScope) {

		function init(options) {

			window.i18n.init(options, function (localize) {

				translations = {};

				if (!$rootScope.$$phase) {
					$rootScope.$digest();
				}

				t = localize;

				$rootScope.$broadcast('i18nextLanguageChange');

			});

		}

		/*
		 * hasOwnOptions means that we are passing options to
		 * $i18next so we can't use previous saved translation.
		 */
		function translate(key, options, hasOwnOptions) {

			var lng = options.lng || 'auto';

			if (!translations[lng]) {
				translations[lng] = {};
			}

			if (!t) {
				translations[lng][key] = key;
			} else if (!translations[lng][key] || hasOwnOptions) {
				translations[lng][key] = t(key, options);
			}

		}

		function $i18nextTanslate(key, options) {

			var mergedOptions = options ? angular.extend({}, optionsObj, options) : optionsObj;

			translate(key, mergedOptions, !!options);

			return (options && options.lng) ? translations[options.lng][key] :
				!!optionsObj.lng ? translations[optionsObj.lng][key] : translations['auto'][key];

		}

		$i18nextTanslate.debugMsg = [];

		optionsObj = $i18nextTanslate.options = self.options;

		$rootScope.$watch(function () { return $i18nextTanslate.options; }, function (newOptions, oldOptions) {

			$i18nextTanslate.debugMsg.push('i18next options changed: \n', 'old options', oldOptions, 'new options', newOptions);

			optionsObj = $i18nextTanslate.options;

			if (oldOptions !== newOptions) {
				init(optionsObj);
			}

		}, true);

		init(optionsObj);

		return $i18nextTanslate;

	}];

});

angular.module('jm.i18next').directive('ngI18next', ['$rootScope', '$i18next', '$compile', '$parse', function ($rootScope, $i18next, $compile, $parse) {

	'use strict';

	function parse(scope, element, key, attr, options) {
		var string;
		if (options) {
			string = $i18next(key, options);
        } else {
            string = $i18next(key);
		}

        if (!attr) {
            element.text(string);
        } else if (attr === 'html') {
            element.html(string);
        } else {
			element.attr(attr, string);
        }

		/*
		 * Now compile the content of the element and bind the variables to
		 * the scope
		 */
		$compile(element.contents())(scope);

		if (!$rootScope.$$phase) {
			$rootScope.$digest();
		}
	}


	function tokenize(text) {
        // Gather attributes, options, and key
        var attributes, options, key;
        var matching = text.match(/\[(.*)\](?:\((.*)\))?/);

        // Handle supplied attributes and options
        if (matching) {
            // Parse multiple attributes
            attributes = matching[1].split(':');
            if (attributes.indexOf('i18next') !== -1) {
            	// Convert the supplied options to valid JSON
                var optionsString = matching[2].replace(/'/g, '"');
                var optionsString = optionsString.replace(/([a-zA-Z][^:^"]*)(?=\s*:)/g, '"$1"');

                try {
                    options = JSON.parse(optionsString);

                } catch (e) {
                    // The options were not legally formatted, or not supplied. Ignoring.
                }

                // Remove i18next from attributes list
                attributes.splice(attributes.indexOf('i18next'), 1);
            }

            // Remove the attribute and options part of the text, leaving just the key
            text = text.replace(matching[0], "");
        }

        var data = {
            attributes: attributes && !!attributes.length && attributes,
            options: options,
            key: text
        }

        return data;
    }


	function localize(scope, element, key, attributes, options) {
        if (!attributes) {
            parse(scope, element, key, attributes, options);
            return;
        }
        for (var i = 0; i < attributes.length; i++) {
            parse(scope, element, key, attributes[i], options);
        }
	}

	return {

		// 'A': only as attribute
		restrict: 'A',

		scope: false,

		link: function postLink(scope, element, attrs) {

			var key;
            var tokens;

            function observe (value) {
                tokens = tokenize(value);
				if (!tokens.key) {
                    if (tokens.attributes && tokens.attributes.indexOf('html' !== -1)) {
                       key = element.html().replace(/\n/g, "").replace(/^\s+|\s+$/g,"").replace(/[ \t]{2,}/g, " "); // RegEx removes whitespace
                    } else {
					   key = element.text().replace(/\n/g, "").replace(/^\s+|\s+$/g,"").replace(/[ \t]{2,}/g, " "); // RegEx removes whitespace
                    }
				} else {
					key = tokens.key;
				}

				if (!key) {
					// Well, seems that we don't have anything to translate...
					return;
				}

				localize(scope, element, key, tokens.attributes, tokens.options);
			}

			attrs.$observe('ngI18next', observe);
			observe(attrs.ngI18next);

			scope.$on('i18nextLanguageChange', function () {
				localize(scope, element, key, tokens.attributes, tokens.options);
			});
		}

	};

}]);

angular.module('jm.i18next').filter('i18next', ['$i18next', function ($i18next) {

	'use strict';

	return function (string, options) {

		return $i18next(string, options);

	};

}]);
