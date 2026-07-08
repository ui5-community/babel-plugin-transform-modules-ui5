import { types as t } from "@babel/core";
import { parse as parseComment } from "comment-parser";

const classInfoValueTags = ["alias", "name", "namespace"];
const classInfoBoolTags = ["nonUI5", "controller", "keepConstructor"];

/**
 * Parse a babel `CommentBlock`'s `.value` (which omits the surrounding
 * `/*` … `*\/` delimiters) using comment-parser.
 *
 * Returns the list of tags as `{ tag, name, description, type, optional }`.
 * Returns `[]` on empty input or when no tags are present.
 *
 * Unlike doctrine, comment-parser does not bail on unknown or malformed
 * tags — every recognised tag in the block is returned. This is the
 * fix for issue #150 where doctrine stopped at the first tag it could
 * not handle (e.g. optional `@param` followed by a bare `@class`).
 */
function parseJsDoc(commentValue) {
  const block = parseComment(`/*${commentValue}*/`)[0];
  return block ? block.tags : [];
}

export function getJsDocClassInfo(node, parent) {
  if (node.leadingComments) {
    return node.leadingComments
      .filter(isCommentBlock)
      .map((comment) => {
        const tags = parseJsDoc(comment.value);
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
    const tags = parseJsDoc(comment.value);
    if (!tags.length) {
      continue;
    }
    const map = {};
    for (const tag of tags) {
      let value = tag.name || tag.description || true;
      if (value === "false") value = false;
      map[tag.tag] = value;
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
  const lower = name.toLowerCase();
  return tags.find((tag) => tag.tag.toLowerCase() === lower);
}

function notEmpty(obj) {
  return Object.values(obj).some((value) => value);
}

export function hasJsdocGlobalExportFlag(node) {
  if (!node.leadingComments) {
    return false;
  }
  return node.leadingComments.filter(isCommentBlock).some((comment) => {
    return parseJsDoc(comment.value).some((tag) => tag.tag === "global");
  });
}

// This doesn't exist on babel-types
function isCommentBlock(node) {
  return node && node.type === "CommentBlock";
}
