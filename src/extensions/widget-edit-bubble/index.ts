import { widgetEditBubblePlugin } from './widget-edit-bubble';

export function widgetEditBubble() {
    return widgetEditBubblePlugin;
}

export {
    resolveWidgetEditTarget,
    isWidgetEditableSelection,
    type WidgetEditTarget,
    type WidgetEditTargetKind,
} from './selection-target';
