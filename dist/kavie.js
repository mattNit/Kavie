/*!
    Kavie - knockout observable validator
    Author: Matthew Nitschke
    License: MIT (http://www.opensource.org/licenses/mit-license.php)
    Version: 2.5.0
*/

(function (factory) {
    if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        factory(require("knockout"), exports);
    } else if (typeof define === "function" && define["amd"]) {
        define(["knockout", "exports"], factory);
    } else {
        factory(ko, Kavie = {});
    }
}(function (ko, exports) {

    if (typeof (ko) === 'undefined') {
        throw new Error('Please load knockout before Kavie');
    }

    exports.settings = {
        subscriptionValidation: true
    }

    exports.sections = {};

    exports.reset = function () {
        exports.sections = {};
    }

    exports.isValid = function (properties) {

        var isValid = true;

        var kavieObservables = compileObservables(properties);

        for (var i = 0; i < kavieObservables.length; i++) {
            kavieObservables[i].startValidation();

            if (isValid) {
                if (kavieObservables[i].hasError()) {
                    isValid = false;
                }
            }
        }

        return isValid;
    }

    exports.isValidAsync = function (vm) {
        var kavieObservables = compileObservables(vm);
        var promises = [];

        for (var i = 0; i < kavieObservables.length; i++) {
            var promise = kavieObservables[i].startAsyncValidation();

            if (promise) { 
                promises = promises.concat(promise);
            }
        }

        var synchronousMethodsValid = exports.isValid(vm);

        return Promise.all(promises).then(function (results) {
            return results.every(isTrue) && synchronousMethodsValid;
        });
    }

    exports.deactivate = function (vm) {
        var kavieObservables = compileObservables(vm);

        for (var i = 0; i < kavieObservables.length; i++) {
            kavieObservables[i].stopValidation();
        }
    }

    exports.addVariableValidation = function (sectionName, shouldValidate) {
        var section = getSection(sectionName);
        section.validate = shouldValidate;

        if (ko.isObservable(shouldValidate)) {
            shouldValidate.subscribe(function (newValue) {
                if (!newValue) {
                    ko.utils.arrayMap(section.observables, function (observable) {
                        observable.stopValidation();
                    });
                }
            })
        }
    }

    exports.addSectionChild = function (parentSectionName, childSectionName) {
        var parentSection = getSection(parentSectionName);
        var childSection = getSection(childSectionName);

        parentSection.children[childSectionName] = childSection;
    }

    exports.addSectionValidators = function (sectionName, sectionRules) {
        var section = getSection(sectionName);

        section.rules = ko.utils.extend(section.rules, sectionRules);
    }

    var compileObservables = function (data) {
        if (!data) {
            throw "Data must not be null";
        }

        var kavieObservables = [];

        if (Array.isArray(data)) {
            for (var i = 0; i < data.length; i++) {
                kavieObservables = kavieObservables.concat(compileObservables(data[i]));
            }

        } else if (typeof data === "string") {
            var section = exports.sections[data];

            if (section) {
                if (ko.unwrap(section.validate)) {
                    var childrenKeys = Object.keys(section.children);

                    for (var i = 0; i < childrenKeys.length; i++) {
                        kavieObservables = kavieObservables.concat(compileObservables(childrenKeys[i]));
                    }

                    kavieObservables = kavieObservables.concat(section.observables);

                    if (Object.keys(section.rules).length > 0) {
                        kavieObservables = kavieObservables.map(function (observable) {
                            observable.rules = ko.utils.extend(observable.rules, section.rules);
                            return observable;
                        });
                    }
                }
            } else {
                console.warn("Kavie - No section found with the name: " + data);
            }
        } else {

            if (isKavieObservable(data)) {
                kavieObservables.push(data);
            } else {
                var keys = Object.keys(data);
                for (var i = 0; i < keys.length; i++) {
                    if (isKavieObservable(data[keys[i]])) {
                        kavieObservables.push(data[keys[i]]);
                    }
                }
            }

        }

        return kavieObservables;
    }

    var getSection = function (sectionName) {


        var section = exports.sections[sectionName];
        if (!section) {
            exports.sections[sectionName] = new KavieSection();
            section = exports.sections[sectionName];
        }
        return section;
    }

    var isKavieObservable = function (observable) {
        return ko.isObservable(observable) && observable.hasOwnProperty("hasError"); 
    }

    var hasValue = function (value) {
        return !(value == null || value.length === 0);
    }

    var isTrue = function (value) {
        return !!(value);
    }

    exports.validatorFunctions = {
        required: {
            validator: function (propVal, eleVal) {
                if (propVal) {
                    return hasValue(eleVal);
                } else {
                    return true;
                }
            },
            message: "This field is required"
        },
        numeric: {
            validator: function (propVal, eleVal) {
                if (propVal && hasValue(eleVal)) {
                    return !isNaN(parseFloat(eleVal)) && isFinite(eleVal);
                } else {
                    return true;
                }
            },
            message: "Please enter a numeric value"
        },
        maxLength: {
            validator: function (propVal, eleVal) {
                if (eleVal) {
                    return eleVal.length <= parseInt(propVal);
                }
                return true; 
            },
            message: "Please enter a value less than or equal to {propVal}"
        },
        minLength: {
            validator: function (propVal, eleVal) {
                if (eleVal) {
                    return eleVal.length >= parseInt(propVal);
                }
                return false; 
            },
            message: "Please enter a value greater than or equal to {propVal}"
        },
        matches: function (propVal, eleVal) {
            if (ko.unwrap(propVal) == ko.unwrap(eleVal)) {
                return true;
            }
            return false;
        },
        date: {
            validator: function (propVal, eleVal) {
                if (propVal && hasValue(eleVal)) {

                    if (!eleVal.match(/^(\d{2})\/(\d{2})\/((\d{4})|(\d{2}))$/)) {
                        return false;
                    }

                    date = eleVal;
                    var dt = date.split("/");

                    var month = dt[0];
                    if (parseInt(month) > 12 || parseInt(month) < 1) {
                        return false;
                    }

                    var year = dt[2];
                    if (parseInt(year) <= 0) {
                        return false;
                    }

                    var day = dt[1];
                    var daysInMonth = new Date(year, month, 0).getDate();
                    if (parseInt(day) > daysInMonth || parseInt(day) < 1) {
                        return false;
                    }
                    return true;

                } else {
                    return true;
                }
            },
            message: "Please enter a valid date"
        },
        birthdate: {
            validator: function (propVal, eleVal) {
                if (propVal && hasValue(eleVal)) {
                    if (!exports.validatorFunctions.date.validator(propVal, eleVal)) {
                        return false;
                    }

                    var date = new Date(eleVal);

                    if (date > new Date()) {
                        return false;
                    }

                    var minDateAllowed = new Date();
                    minDateAllowed.setFullYear(minDateAllowed.getFullYear() - 120); 

                    if (date < minDateAllowed) {
                        return false;
                    }
                    return true;

                } else {
                    return true;
                }
            },
            message: "Please enter a valid birthdate"
        },
        phone: {
            validator: function (propVal, eleVal) {
                if (propVal && hasValue(eleVal)) {
                    if (eleVal.match(/^(1-?)?(\([2-9]\d{2}\)|[2-9]\d{2})-?[2-9]\d{2}-?\d{4}$/)) {
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    return true;
                }
            },
            message: "Please enter a valid phone number"
        },
        email: {
            validator: function (propVal, eleVal) {
                if (propVal && hasValue(eleVal)) {
                    if (eleVal.match(/^(?:(?:[\w`~!#$%^&*\-=+;:{}'|,?\/]+(?:(?:\.(?:"(?:\\?[\w`~!#$%^&*\-=+;:{}'|,?\/\.()<>\[\] @]|\\"|\\\\)*"|[\w`~!#$%^&*\-=+;:{}'|,?\/]+))*\.[\w`~!#$%^&*\-=+;:{}'|,?\/]+)?)|(?:"(?:\\?[\w`~!#$%^&*\-=+;:{}'|,?\/\.()<>\[\] @]|\\"|\\\\)+"))@(?:[a-zA-Z\d\-]+(?:\.[a-zA-Z\d\-]+)*|\[\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\])$/)) {
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    return true;
                }
            },
            message: "Please enter a valid email address"
        },
        regexPattern: function (propVal, eleVal) {
            return eleVal.toString().match(propVal) !== null;
        }
    }

    exports.isSectionValid = function (sectionName) {
        console.warn("isSectionValid is depricated and will be removed in the next release. Please use isValid('sectionName') instead");
        return exports.isValid(sectionName);
    }

    exports.isSectionValidAsync = function (sectionName) {
        console.warn("isSectionValidAsync is depricated and will be removed in the next release. Please use isValidAsync('sectionName') instead");
        return exports.isValidAsync(sectionName);
    }

    function KavieSection() {
        var self = this;

        self.observables = [];
        self.rules = [];
        self.children = {};
        self.validate = true; 
    }

    ko.extenders.kavie = function (target, rules) {
        target.hasError = ko.observable(); 
        target.errorMessage = ko.observable();

        if (rules.section) {
            if (!exports.sections[rules.section]) {
                exports.sections[rules.section] = new KavieSection();
            }

            exports.sections[rules.section].observables.push(target);
            rules.section = ""; 
        }

        if (target.rules) {
            target.rules = ko.utils.extend(target.rules, rules);
        } else {
            target.rules = rules;
        }

        function validate(newValue) {
            var rules = target.rules;

            var isObservableValid = true;
            var erroredOutValidator = null; 

            for (key in rules) {
                var validatorObject = exports.validatorFunctions[key];

                if (validatorObject && !validatorObject.async) { 

                    var property = ko.unwrap(rules[key]);
                    var isValid = validatorObject.validator(property, newValue);

                    if (isObservableValid && !isValid) {
                        isObservableValid = false;
                        validatorObject.property = property; 
                        erroredOutValidator = validatorObject;
                    }
                }
            }

            setValidationResult(isObservableValid, erroredOutValidator);
        }

        function validateAsync(newValue) {
            var rules = target.rules;

            var promises = [];

            for (key in rules) {
                var validatorObject = exports.validatorFunctions[key];

                if (validatorObject && validatorObject.async) {

                    var promise = new Promise(function (callback) {

                        var property = ko.unwrap(rules[key]); 
                        validatorObject.property = property;

                        var valObj = validatorObject; 

                        validatorObject.validator(property, newValue, function (isValid) {
                            return callback({
                                isValid: isValid,
                                validatorObject: valObj
                            })
                        });

                    });

                    promises.push(promise);

                }
            }

            return Promise.all(promises).then(function (validatorResults) {
                for (var i = 0; i < validatorResults.length; i++) {
                    if (!validatorResults[i].isValid) {
                        setValidationResult(validatorResults[i].isValid, validatorResults[i].validatorObject);
                        return false;
                    }
                }

                setValidationResult(true, validatorResults.validatorObject);
                return true;
            });
        }

        function setValidationResult(isValid, validatorObject) {
            if (!isValid) {
                if (validatorObject.message) {
                    var message = validatorObject.message;
                    var propertyValue = validatorObject.property; 
                    target.errorMessage(message.replace("{propVal}", propertyValue));
                } else {
                    target.errorMessage("");
                }
                target.hasError(true);

            } else {
                target.errorMessage("");
                target.hasError(false);
            }
        }

        target.startValidation = function () {
            if (exports.settings.subscriptionValidation) {
                target.subscription = target.subscribe(validate); 
            }
            validate(target());
        }

        target.startAsyncValidation = function () {
            if (exports.settings.subscriptionValidation) {
                target.subscription = target.subscribe(validateAsync);
            }
            return validateAsync(target());
        }

        target.stopValidation = function () {
            if (target.subscription) {
                target.subscription.dispose();
            }
            target.hasError(false);
            target.errorMessage("");
        }

        return target;
    };
}))