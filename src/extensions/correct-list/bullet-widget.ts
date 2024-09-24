import {WidgetType} from "@codemirror/view";

export class BulletWidget extends WidgetType {
    constructor(private className: string, private level: number, private indentation: string) {
        super();
    }

    toDOM() {
        let span = document.createElement("span");
        span.innerHTML = `${this.indentation}${this.getBulletSymbol(this.level)} `;
        span.className = `cm-bullet-list ${this.className}`;
        return span;
    }

    private getBulletSymbol(level: number): string {
        const symbols = ["●", "○", "■", "□", "◆", "◇"];
        return symbols[level % symbols.length];
    }
}