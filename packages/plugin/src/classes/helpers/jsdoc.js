import { types as t } from "@babel/core";
import doctrine from "doctrine";
import ignoreCase from "ignore-case";

const classInfoValueTags = ["alias", "name", "namespace", "metadata"];
const classInfoBoolTags = ["nonUI5", "controller", "keepConstructor"];

export function getJsDocClassInfo(node, parent) {
  if (node.leadingComments) {
    return node.leadingComments
      .filter(isCommentBlock)
      .map(comment => {
        const docAST = doctrine.parse(comment.value, {
          unwrap: true,
        });
        const tags = docAST.tags || [];
        const info = {};
        for (const tagName of classInfoValueTags) {
          const value = getJsDocTagValue(tags, tagName);
          if (value) {
            info[tagName] = value;
          }
        }
        for (const tagName of classInfoBoolTags) {
          const value = !!getJsDocTag(tags, tagName);
          if (value) {
            info[tagName] = value;
          }
        }
        return info;
      })
      .filter(notEmpty)[0];
  }
  // Else see if the JSDoc are on the return statement (eg. return class X extends SAPClass)
  // or export statement (eg. export default class X extends SAPClass)
  else if (
    (t.isClassExpression(node) && t.isReturnStatement(parent)) ||
    (t.isClassDeclaration(node) && t.isExportDefaultDeclaration(parent))
  ) {
    return getJsDocClassInfo(parent);
  } else {
    return {};
  }
}

/**
 * Returns a map of tags by name.
 * Converts empty to bool. Also converts bool value
 */
export function getTags(comments) {
  if (!comments) {
    return {};
  }
  for (const comment of comments) {
    if (!isCommentBlock(comment)) {
      continue;
    }
    const docAST = doctrine.parse(comment.value, {
      unwrap: true,
    });
    const tags = docAST.tags;
    if (!tags || !tags.length) {
      continue;
    }
    const map = {};
    for (const tag of tags) {
      const title = tag.title;
      let value = tag.name || tag.description || true;
      if (value === "false") value = false;
      map[title] = value;
    }
    return map;
  }
  return {};
}

function getJsDocTagValue(tags, name) {
  const tag = getJsDocTag(tags, name);
  return tag && (tag.name || tag.description);
}

function getJsDocTag(tags, name) {
  return tags.find(t => ignoreCase.equals(name, t.title));
}

function notEmpty(obj) {
  return Object.values(obj).some(value => value);
}

export function hasJsdocGlobalExportFlag(node) {
  if (!node.leadingComments) {
    return false;
  }
  return node.leadingComments.filter(isCommentBlock).some(comment => {
    return (
      doctrine.parse(comment.value, {
        unwrap: true,
        tags: ["global"],
      }).tags.length > 0
    );
  });
}

// This doesn't exist on babel-types
function isCommentBlock(node) {
  return node && node.type === "CommentBlock";
}
