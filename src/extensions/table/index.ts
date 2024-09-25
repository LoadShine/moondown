import {Compartment, Extension} from "@codemirror/state";
import {tablePositions} from "./table-position";
import {renderTables} from "./render-tables";

export const tableExtension: Extension = [
    tablePositions,
    (new Compartment()).of(renderTables)
];
