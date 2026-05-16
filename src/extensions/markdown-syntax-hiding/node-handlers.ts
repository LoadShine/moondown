export type { DecorationItem, HandlerContext } from './types';

export {
    handleFencedCode,
    handleBlockquote,
    handleHorizontalRule,
    handleOrderedListLineMarker,
    handleListItem,
    handleHeading,
} from './node-structural-handlers';

export {
    handleEmphasis,
    handleInlineCode,
    handleLink,
    handleStrikethrough,
    handleMark,
    handleUnderline,
    handleImage,
} from './node-inline-handlers';

export {
    handleFootnote,
    handleFootnoteDefinition,
    handleLinkDefinition,
} from './reference-handlers';
