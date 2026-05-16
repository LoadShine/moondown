import { HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { codeFont, type ThemeColors } from './theme-palette';

export function createHighlightStyle(colors: ThemeColors): HighlightStyle {
    return HighlightStyle.define([
        { tag: tags.heading1, fontWeight: '700', fontSize: '2em', color: colors.primaryText },
        { tag: tags.heading2, fontWeight: '650', fontSize: '1.55em', color: colors.primaryText },
        { tag: tags.heading3, fontWeight: '600', fontSize: '1.25em', color: colors.primaryText },
        { tag: tags.link, color: colors.lightBlue },
        { tag: tags.emphasis, fontStyle: 'italic' },
        { tag: tags.strong, fontWeight: 'bold' },
        { tag: tags.keyword, color: colors.codeKeyword, fontFamily: codeFont },
        { tag: tags.atom, color: colors.codeNumber, fontFamily: codeFont },
        { tag: tags.bool, color: colors.codeNumber, fontFamily: codeFont },
        { tag: tags.url, color: colors.codeString, fontFamily: codeFont },
        { tag: tags.labelName, color: colors.codeTag, fontFamily: codeFont },
        { tag: tags.inserted, color: colors.codeString, fontFamily: codeFont },
        { tag: tags.deleted, color: colors.codeTag, fontFamily: codeFont },
        { tag: tags.literal, color: colors.codeNumber, fontFamily: codeFont },
        { tag: tags.string, color: colors.codeString, fontFamily: codeFont },
        { tag: tags.number, color: colors.codeNumber, fontFamily: codeFont },
        { tag: [tags.regexp, tags.escape, tags.special(tags.string)], color: colors.codeNumber, fontFamily: codeFont },
        { tag: tags.definition(tags.propertyName), color: colors.codeAttribute, fontFamily: codeFont },
        { tag: tags.function(tags.variableName), color: colors.codeFunction, fontFamily: codeFont },
        { tag: tags.typeName, color: colors.codeType, fontFamily: codeFont },
        { tag: tags.className, color: colors.codeType, fontFamily: codeFont },
        { tag: tags.comment, color: colors.codeComment, fontStyle: 'italic', fontFamily: codeFont },
        { tag: tags.invalid, color: colors.codeTag, fontFamily: codeFont },
        { tag: tags.variableName, color: colors.codeVariable, fontFamily: codeFont },
        { tag: tags.operator, color: colors.codeOperator, fontFamily: codeFont },
        { tag: tags.punctuation, color: colors.codeOperator, fontFamily: codeFont },
        { tag: tags.bracket, color: colors.codeOperator, fontFamily: codeFont },
        { tag: tags.tagName, color: colors.codeTag, fontFamily: codeFont },
        { tag: tags.attributeName, color: colors.codeAttribute, fontFamily: codeFont },
        { tag: tags.attributeValue, color: colors.codeString, fontFamily: codeFont },

        { tag: tags.meta, class: 'cm-meta' },
        { tag: tags.processingInstruction, class: 'cm-meta' },
    ]);
}
