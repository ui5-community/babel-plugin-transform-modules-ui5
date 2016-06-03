"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _path2 = require("path");

var _path3 = _interopRequireDefault(_path2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (_ref) {
    var t = _ref.types;

    var ui5ModuleVisitor = {
        Program: {
            enter: function enter(path) {
                var filePath = _path3.default.resolve(path.hub.file.opts.filename);

                var sourceRootPath = getSourceRoot();

                var relativeFilePath = null;
                var relativeFilePathWithoutExtension = null;
                var namespace = null;
                if (filePath.startsWith(sourceRootPath)) {
                    relativeFilePath = _path3.default.relative(sourceRootPath, filePath);
                    relativeFilePathWithoutExtension = _path3.default.dirname(relativeFilePath) + "/" + _path3.default.basename(relativeFilePath, _path3.default.extname(relativeFilePath));

                    var parts = relativeFilePath.split("/");
                    if (parts.length <= 1) {
                        namespace = relativeFilePath;
                    } else {
                        parts.pop();
                        namespace = parts.join(".");
                    }
                }

                if (!path.state) {
                    path.state = {};
                }
                path.state.ui5 = {
                    filePath: filePath,
                    relativeFilePath: relativeFilePath,
                    relativeFilePathWithoutExtension: relativeFilePathWithoutExtension,
                    namespace: namespace,
                    className: null,
                    fullClassName: null,
                    superClassName: null,
                    imports: [],
                    staticMembers: []
                };
            }
        },

        ImportDeclaration: function ImportDeclaration(path) {
            var state = path.state.ui5;
            var node = path.node;
            var name = null;

            var src = node.source.value;
            if (src.startsWith("./") || src.startsWith("../")) {
                var sourceRootPath = getSourceRoot();
                src = _path3.default.relative(sourceRootPath, _path.resolve(path.hub.file.opts.filename, src));
            }

            if (node.specifiers && node.specifiers.length === 1) {
                name = node.specifiers[0].local.name;
            } else {
                var parts = src.split("/");
                name = parts[parts.length - 1];
            }

            if (node.leadingComments) {
                state.leadingComments = node.leadingComments;
            }

            state.imports.push({
                name: name,
                src: src
            });

            path.remove();
        },

        ExportDeclaration: function ExportDeclaration(path) {
            var state = path.state.ui5;
            var program = path.hub.file.ast.program;

            var defineCallArgs = [t.stringLiteral(state.relativeFilePathWithoutExtension), t.arrayExpression(state.imports.map(function (i) {
                return t.stringLiteral(i.src);
            })), t.functionExpression(null, state.imports.map(function (i) {
                return t.identifier(i.name);
            }), t.blockStatement([t.expressionStatement(t.stringLiteral("use strict")), t.returnStatement(transformClass(path.node.declaration, program, state))]))];
            var defineCall = t.callExpression(t.identifier("sap.ui.define"), defineCallArgs);
            if (state.leadingComments) {
                defineCall.leadingComments = state.leadingComments;
            }
            path.replaceWith(defineCall);

            // Add static members
            for (var key in state.staticMembers) {
                var id = t.identifier(state.fullClassName + "." + key);
                var statement = t.expressionStatement(t.assignmentExpression("=", id, state.staticMembers[key]));
                path.insertAfter(statement);
            }
        },

        CallExpression: function CallExpression(path) {
            var state = path.state.ui5;
            var node = path.node;

            if (node.callee.type === "Super") {
                if (!state.superClassName) {
                    this.errorWithNode("The keyword 'super' can only used in a derrived class.");
                }

                var identifier = t.identifier(state.superClassName + ".apply");
                var args = t.arrayExpression(node.arguments);
                if (node.arguments.length === 1 && node.arguments[0].type === "Identifier" && node.arguments[0].name === "arguments") {
                    args = t.identifier("arguments");
                }
                path.replaceWith(t.callExpression(identifier, [t.identifier("this"), args]));
            } else if (node.callee.object && node.callee.object.type === "Super") {
                if (!state.superClassName) {
                    this.errorWithNode("The keyword 'super' can only used in a derrived class.");
                }

                var _identifier = t.identifier(state.superClassName + ".prototype" + "." + node.callee.property.name + ".apply");
                path.replaceWith(t.callExpression(_identifier, [t.identifier("this"), t.arrayExpression(node.arguments)]));
            }
        }
    };

    function transformClass(node, program, state) {
        if (node.type !== "ClassDeclaration") {
            return node;
        } else {
            var _ret = function () {
                resolveClass(node, state);

                var props = [];
                node.body.body.forEach(function (member) {
                    if (member.type === "ClassMethod") {
                        var func = t.functionExpression(null, member.params, member.body);
                        if (!member.static) {
                            props.push(t.objectProperty(member.key, func));
                        } else {
                            func.body.body.unshift(t.expressionStatement(t.stringLiteral("use strict")));
                            state.staticMembers[member.key.name] = func;
                        }
                    } else if (member.type == "ClassProperty") {
                        if (!member.static) {
                            props.push(t.objectProperty(member.key, member.value));
                        } else {
                            state.staticMembers[member.key.name] = member.value;
                        }
                    }
                });

                var bodyJSON = t.objectExpression(props);
                var extendCallArgs = [t.stringLiteral(state.fullClassName), bodyJSON];
                var extendCall = t.callExpression(t.identifier(state.superClassName + ".extend"), extendCallArgs);
                return {
                    v: extendCall
                };
            }();

            if ((typeof _ret === "undefined" ? "undefined" : _typeof(_ret)) === "object") return _ret.v;
        }
    }

    function resolveClass(node, state) {
        state.className = node.id.name;
        state.superClassName = node.superClass.name;
        if (state.namespace) {
            state.fullClassName = state.namespace + "." + state.className;
        } else {
            state.fullClassName = state.className;
        }
    }

    function getSourceRoot() {
        var sourceRootPath = null;
        if (path.hub.file.opts.sourceRoot) {
            sourceRootPath = _path3.default.resolve(path.hub.file.opts.sourceRoot);
        } else {
            sourceRootPath = _path3.default.resolve("./");
        }
        return sourceRootPath;
    }

    return {
        visitor: ui5ModuleVisitor
    };
};
module.exports = exports.default;