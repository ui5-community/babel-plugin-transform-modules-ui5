export default function ({ types: t })
{
    const ui5ModuleVisitor = {
        Program: {
            enter: path => {
                if (!path.state)
                {
                    path.state = {};
                }
                path.state.ui5 = {
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





        ExportDeclaration: {
            enter: path => {
                const state = path.state.ui5;

                if (path.node.declaration)
                {

                }

                const defineCallArgs = [
                    t.arrayExpression(state.imports.map(i => t.stringLiteral(i.src))),
                    t.functionExpression(null, state.imports.map(i => t.identifier(i.name)), t.blockStatement([
                        t.expressionStatement(t.stringLiteral("use strict")),
                        t.returnStatement()
                    ]))
                ];
                const defineCall = t.callExpression(t.identifier("sap.ui.define"), defineCallArgs);
                if (state.leadingComments)
                {
                    defineCall.leadingComments = state.leadingComments;
                }
                path.replaceWith(defineCall);
            }
        }
    };



    return {
        visitor: ui5ModuleVisitor
    };
};
