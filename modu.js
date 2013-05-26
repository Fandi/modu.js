(function initializeModuleLoader($) {
    var UNDEFINED;
    var ERROR = 'error';
    var NONE = 'none';
    var LOADING = 'loading';
    var DONE = 'done';
    var modules = {};
    
    var registerModule = function registerModule(id, module) {
        if (modules.hasOwnProperty(id) === false) {
            modules[id] = {
                'state': NONE,
                'async': false,
                'counter': 0,
                'value': UNDEFINED,
                'main': UNDEFINED,
                'dependencies': [],
                'dependants': []
            };
        }
        
        if (module === UNDEFINED) {
            return;
        }
        
        modules[id].value = module;
    };
    
    var registerModuleDependency = function registerModuleDependency(id, dependencyId) {
        if (modules.hasOwnProperty(dependencyId) === false) {
            registerModule(dependencyId, UNDEFINED);
        }
        
        modules[id].dependencies.push(dependencyId);
    };
    
    var registerModuleDependant = function registerModuleDependant(id, dependantId) {
        if (modules[id].dependants.indexOf(dependantId) === -1) {
            modules[dependantId].counter++;
            modules[id].dependants.push(dependantId);
        }
    };
    
    var invokeModuleMain = function invokeModuleMain(id) {
        for (var i = 0; i < modules[id].dependencies.length; i++) {
            modules[id].dependencies[i] = modules[modules[id].dependencies[i]].value;
        }
                
        try {
            modules[id].main.apply(modules[id].value, modules[id].dependencies);
        
            if (modules[id].async === false) {
                setModuleStateAsDone(id);
            }
        } catch (ex) {
            modules[id].state = ERROR;
            throw ex;
        }
    };
    
    var setModuleStateAsDone = function setModuleStateAsDone(id) {
        modules[id].state = DONE;
        
        for (var i = 0; i < modules[id].dependants.length; i++) {
            if (--modules[modules[id].dependants[i]].counter === 0) {
                invokeModuleMain(modules[id].dependants[i]);
            }
        }
    };
    
    var Module = function Module(id) {
        if (this instanceof Module === false ||
            arguments.length !== 1) {
            throw new SyntaxError();
        }
        
        if (typeof id !== 'string') {
            throw new TypeError();
        }
        
        if (modules.hasOwnProperty(id) &&
            modules[id].value !== UNDEFINED) {
            return modules[id].value;
        }
        
        Object.defineProperty(this, 'id', {
            'value': id,
            'enumerable': true
        });
        
        registerModule(id, this);
        
        if (modules[id].state === NONE) {
            modules[id].state = LOADING;
        }
        
        return this;
    };
    
    Object.defineProperties(Module.prototype, {
        'require': {
            'value': function require(_modules) {
                if (this instanceof Module === false ||
                    arguments.length === 0) {
                    throw new SyntaxError();
                }
                
                if (modules[this.id].main !== UNDEFINED) {
                    throw new Error();
                }
                
                for (var i = 0; i < arguments.length; i++) {
                    if (typeof arguments[i] !== 'string') {
                        throw new TypeError();
                    }
                    
                    if (arguments[i] === this.id) {
                        throw new Error();
                    }
                    
                    registerModuleDependency(this.id, arguments[i]);
                }
                
                return this;
            },
            'enumerable': true
        },
        'main': {
            'get': function getMain() {
                return modules[this.id].main;
            },
            'set': function setMain(value) {
                if (typeof value !== 'function') {
                    throw new TypeError();
                }
                
                if (value === this.main ||
                    modules[this.id].main !== UNDEFINED) {
                    return;
                }
                
                modules[this.id].main = value;
                modules[this.id].counter = 0;
                
                for (var i = 0; i < modules[this.id].dependencies.length; i++) {
                    var requirementId = modules[this.id].dependencies[i];
                    
                    switch (modules[requirementId].state) {
                        case NONE:
                            registerModuleDependant(requirementId, this.id);
                            modules[requirementId].state = LOADING;
                            
                            try {
                                $.loadModule(requirementId);
                            } catch (ex) {
                                modules[requirementId].state = ERROR;
                                throw ex;
                            }
                            
                            break;
                        case LOADING:
                            registerModuleDependant(requirementId, this.id);                                    
                            break;
                        case DONE:
                            break;
                        case ERROR:
                            throw new ReferenceError();
                        default:
                            throw new Error();
                    }
                }
                
                if (modules[this.id].counter === 0) {
                    invokeModuleMain(this.id);
                }
            },
            'enumerable': true
        },
        'async': {
            'get': function getAsync() {
                return modules[this.id].async;
            },
            'set': function setAsync(value) {
                if (typeof value !== 'boolean') {
                    throw new TypeError();
                }
                
                if (value === this.async ||
                    value === false ||
                    this.done === true) {
                    return;
                }
                
                modules[this.id].async = true;
            },
            'enumerable': true
        },
        'done': {
            'get': function getDone() {
                return modules[this.id].state === DONE;
            },
            'set': function setDone(value) {
                if (typeof value !== 'boolean') {
                    throw new TypeError();
                }
                
                if (this.async === false) {
                    throw new Error();
                }
                
                if (value === this.done ||
                    value === false) {
                    return;
                }
                
                setModuleStateAsDone(this.id);
            },
            'enumerable': true
        }
    });
    Object.preventExtensions(Module.prototype.require);
    Object.preventExtensions(Module.prototype.toString);
    
    Object.defineProperties($.context, {
        'Module': {
            'value': Module,
            'enumerable': true,
            'configurable': true
        },
        'Program': {
            'value': new Module('Program'),
            'enumerable': true,
            'configurable': true
        }
    });
    Object.preventExtensions($.context.Module);
    Object.preventExtensions($.context.Program);
})($);
