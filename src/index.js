import Path from "path";

export default function ({ types: t })
{
    const ui5ModuleVisitor = {
        Program: {
            enter: path => {
                const filePath = Path.resolve(path.hub.file.opts.filename);

                let sourceRootPath = null;
                if (path.hub.file.opts.sourceRoot)
                {
                    sourceRootPath = Path.resolve(path.hub.file.opts.sourceRoot);
                }
                else
                {
                    sourceRootPath = Path.resolve("./");
                }

                let relativeFilePath = null;
                let relativeFilePathWithoutExtension = null;
                let namespace = null;
                if (filePath.startsWith(sourceRootPath))
                {
                    relativeFilePath = Path.relative(sourceRootPath, filePath);
                    relativeFilePathWithoutExtension = Path.dirname(relativeFilePath) + "/" + Path.basename(relativeFilePath, Path.extname(relativeFilePath));

                    const parts = relativeFilePath.split("/");
                    if (parts.length <= 1)
                    {
                        namespace = relativeFilePath;
                    }
                    else
                    {
                        parts.pop();
                        namespace = parts.join(".");
                    }
                }

                if (!path.state)
                {
                    path.state = {};
                }
                path.state.ui5 = {
                    filePath,
                    relativeFilePath,
                    relativeFilePathWithoutExtension,
                    namespace,
                    className: null,
                    superClassName: null,
                    imports: []
                };
            }
        },





        ImportDeclaration: path => {
            const state = path.state.ui5;
            const node = path.node;
            let name = null;
            const src = node.source.value;
            if (node.specifiers && node.specifiers.length === 1)
            {
                name = node.specifiers[0].local.name;
            }
            else
            {
                const parts = src.split("/");
                name = parts[parts.length - 1];
            }

            if (node.leadingComments)
            {
                state.leadingComments = node.leadingComments;
            }

            state.imports.push({
                name,
                src: src
            });

            path.remove();
        },





        ExportDeclaration: path => {
            const state = path.state.ui5;

            const defineCallArgs = [
                t.stringLiteral(state.relativeFilePathWithoutExtension),
                t.arrayExpression(state.imports.map(i => t.stringLiteral(i.src))),
                t.functionExpression(null, state.imports.map(i => t.identifier(i.name)), t.blockStatement([
                    t.expressionStatement(t.stringLiteral("use strict")),
                    t.returnStatement(transformClass(path.node.declaration, state))
                ]))
            ];
            const defineCall = t.callExpression(t.identifier("sap.ui.define"), defineCallArgs);
            if (state.leadingComments)
            {
                defineCall.leadingComments = state.leadingComments;
            }
            path.replaceWith(defineCall);
        },




        CallExpression(path)
        {
            const state = path.state.ui5;
            const node = path.node;

            if (node.callee.type === "Super")
            {
                if (!state.superClassName)
                {
                    this.errorWithNode("The keyword 'super' can only used in a derrived class.");
                }

                const identifier = t.identifier(state.superClassName + ".apply");
                let args = t.arrayExpression(node.arguments);
                if (node.arguments.length === 1 && node.arguments[0].type === "Identifier" && node.arguments[0].name === "arguments")
                {
                    args = t.identifier("arguments");
                }
                path.replaceWith(
                    t.callExpression(identifier, [
                        t.identifier("this"),
                        args
                    ])
                );
            }
            else if (node.callee.object && node.callee.object.type === "Super")
            {
                if (!state.superClassName)
                {
                    this.errorWithNode("The keyword 'super' can only used in a derrived class.");
                }

                const identifier = t.identifier(state.superClassName + ".prototype" + "." + node.callee.property.name + ".apply");
                path.replaceWith(
                    t.callExpression(identifier, [
                        t.identifier("this"),
                        t.arrayExpression(node.arguments)
                    ])
                );
            }
        }
    };



    function transformClass(node, state)
    {
        if (node.type !== "ClassDeclaration")
        {
            return node;
        }
        else
        {
            resolveClass(node, state);

            const props = [];
            node.body.body.forEach(member => {
                if (member.type === "ClassMethod")
                {
                    const func = t.functionExpression(null, member.params, member.body);
                    props.push(t.objectProperty(member.key, func));
                }
                else if (member.type == "ClassProperty")
                {
                    props.push(t.objectProperty(member.key, member.value));
                }
            });

            const bodyJSON = t.objectExpression(props);
            const extendCallArgs = [
                t.stringLiteral(state.fullClassName),
                bodyJSON
            ];
            const extendCall = t.callExpression(t.identifier(state.superClassName + ".extend"), extendCallArgs);
            return extendCall;
        }
    }






    function resolveClass(node, state)
    {
        state.className = node.id.name;
        state.superClassName = node.superClass.name;
        if (state.namespace)
        {
            state.fullClassName = state.namespace + "." + state.className;
        }
        else
        {
            state.fullClassName = state.className;
        }
    }



    return {
        visitor: ui5ModuleVisitor
    };
};
