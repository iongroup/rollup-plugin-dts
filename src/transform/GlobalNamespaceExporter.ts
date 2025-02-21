import MagicString from "magic-string";
import ts from "typescript";
import { renderTypeParams } from "./NamespaceFixer.js";

interface Export {
  exportClause: ts.NamedExportBindings;
  parentModule: ts.ModuleDeclaration | null;
  exportedName: string;
  localName: string;
  start: number;
  end: number;
}
  
export class GlobalNamespaceExporter {
    private code!: MagicString;

    constructor(private readonly sourceFile: ts.SourceFile) {
    }

    private findExports() {
        const exports = [] as Array<Export>;
        const exportStatements = [] as Array<ts.Statement>;

        const checkExport = (stmt: ts.Statement, parentModule: ts.ModuleDeclaration | null) => {
            if (ts.isExportDeclaration(stmt) && stmt.exportClause && !ts.isNamespaceExport(stmt.exportClause)) {
                exportStatements.push(stmt);
                for (const decl of stmt.exportClause.elements) {
                    const exportedName = decl.name.getText();
                    exports.push({
                        exportClause: stmt.exportClause,
                        parentModule,
                        localName: decl.propertyName?.getText() || exportedName, 
                        exportedName,
                        start: decl.getStart(),
                        end: decl.getEnd()
                    });
                }      
            }
        };

        for (const stmt of this.sourceFile.statements) {
            checkExport(stmt, null);
            if (ts.isModuleDeclaration(stmt)) {
                // Check nested exports
                for (const stmt2 of (stmt.body as ts.ModuleBlock).statements) {
                    checkExport(stmt2, stmt);
                }
            }
        }
        return { exports, exportStatements };
    }

    /**
     * Collect anything about interface, types and classes
     */
    private getAllDeclarations() {
        const declarations = new Map<string, Array<ts.Statement>>();
        for (const stmt of this.sourceFile.statements) {
            console.log(stmt.getText());
            let localName: string = "";
            if (ts.isInterfaceDeclaration(stmt)) {
                localName = stmt.name.getText();
            }
            if (ts.isTypeAliasDeclaration(stmt)) {
                localName = stmt.name.getText();
            } else if (ts.isVariableStatement(stmt)) {
                if (stmt.declarationList.declarations.length > 1) {
                    throw new Error(`Multiple vars not supported in ${stmt.declarationList.getText()}`);
                }
                localName = stmt.declarationList.declarations[0]!.name.getText();
            } else if (ts.isModuleDeclaration(stmt)) {
                localName = stmt.name.getText();
            }
            if (localName) {
                let arr = declarations.get(localName);
                if (!arr) {
                    arr = [];
                    declarations.set(localName, arr);
                }
                arr.push(stmt);
            }
        }
        return declarations;
    }

    public fix() {
        this.code = new MagicString(this.sourceFile.getFullText());
        const { exports, exportStatements } = this.findExports();
        const declarations = this.getAllDeclarations();

        const getFullExportedName = (exp: Export) => {
            let base = "";
            if (exp.parentModule) {
                const parent = exports.find(e => e.localName === exp.parentModule!.name.getText());
                if (parent) {
                    base = getFullExportedName(parent) + ".";
                }
            }
            return base + exp.exportedName;
        }

        const modules = new Set<ts.ModuleDeclaration>();
        for (const exp of exports) {
            exp.parentModule && modules.add(exp.parentModule);
        }

        for (const node of modules) {
            const exp = exports.find(exp => exp.localName == node.name.getText());
            if (!exp) {
                throw new Error(`Can't find the exported data of module "${node.name.getText()}"`);
            }
            // Replace the structure
            const declareMod = ((node.modifiers || []).find(mod => mod.kind === ts.SyntaxKind.DeclareKeyword));
            if (!declareMod) {
                throw new Error(`Can't find the "declare" modifier of module "${node.name.getText()}"`);
            }

            // Add declare global
            this.code.overwrite(declareMod.getStart(), declareMod.getEnd(), "declare global {");
            this.code.appendRight(node.getEnd(), " }");

            // Rename it with proper exported namespace
            this.code.overwrite(node.name.getStart(), node.name.getEnd(), getFullExportedName(exp));

            // Add exports directly in it
            const body = (node.body as ts.ModuleBlock).statements[0];

            for (const exp of exports.filter(exp => exp.parentModule === node)) {
                const declarationList = declarations.get(exp.localName);
                if (!declarationList) {
                    throw new Error(`Can't find any declaration called ${exp.localName}, exported in module "${node.name.getText()}". This can happen if there is a symbol with the same name export in different namespaces.`);
                }
                for (const declaration of declarationList) {
                    if (ts.isTypeAliasDeclaration(declaration) || ts.isInterfaceDeclaration(declaration)) {
                        const typeParams = renderTypeParams(declaration.typeParameters);
                        this.code.appendRight(body!.getStart() - 1, `    export type ${exp.exportedName}${typeParams.in} = ${exp.localName}${typeParams.out};\n`);
                    } else if (ts.isVariableStatement(declaration)) {
                        // Check if const or let, reading the original declaration
                        let specifier = "const";
                        const originalDeclaration = declarations.get(exp.exportedName);
                        if (originalDeclaration && originalDeclaration.length === 1) {
                            const varStatement = originalDeclaration[0] as ts.VariableStatement;
                            const token = varStatement?.declarationList?.getFirstToken();
                            if (token?.kind === ts.SyntaxKind.LetKeyword) {
                                specifier = "let";
                            }
                        }
                        this.code.appendRight(body!.getStart() - 1, `    export ${specifier} ${exp.exportedName}: typeof ${exp.localName};\n`);
                    }
                    // skip the module re-declarations, since they are fixed in their proper blocks.
                }
            }
        }

        for (const node of this.sourceFile.statements as ts.NodeArray<ts.Statement & { $isExported?: boolean }>) {
            const name = (node as unknown as ts.NamedDeclaration).name;
            if (!name?.getText()) {
                continue;
            }
        }

        // Remove the full exports
        for (const stmt of exportStatements) {
            this.code.remove(stmt.getStart(), stmt.getEnd());
        }

        // Add an empty export to make the module a ES module
        const ret = this.code.toString();
        const hasImports = /^import /gm.test(ret);
        return ret + (!hasImports ? "export { }\n" : "");
    }
}