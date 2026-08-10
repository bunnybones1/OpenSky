import { readFileSync, writeFileSync } from 'fs'
import glob from 'glob'
import ts from 'typescript'

glob('bundle/**/*.d.ts', processFiles)
glob('browser/generated/*.d.ts', processFiles)
glob('node/generated/*.d.ts', processFiles)
glob('metadata/generated/*.d.ts', processFiles)

function processFiles(err: Error | null, files: string[]) {
  if (err) {
    console.log(err)
    return process.exit(1)
  }

  const printer = ts.createPrinter()
  const sourceFiles: ts.SourceFile[] = files.map(file =>
    ts.createSourceFile(
      file,
      readFileSync(file, 'utf-8'),
      ts.ScriptTarget.Latest
    )
  )

  const transformerFactory: ts.TransformerFactory<ts.SourceFile> =
    ctx => sourceFile => {
      const newChildren: ts.Node[] = []
      sourceFile.forEachChild(child => {
        if (child) {
          newChildren.push(child)
        }
      })

      const newSourceText = newChildren
        .sort((a, b) =>
          name(a).localeCompare(name(b), undefined, {
            numeric: true,
            sensitivity: 'base'
          })
        )
        .map(child => {
          if (
            ts.isTypeAliasDeclaration(child) &&
            ts.isUnionTypeNode(child.type)
          ) {
            const newUnionChildren: ts.TypeNode[] = []
            for (const node of child.type.types) {
              if (node) {
                newUnionChildren.push(node)
              }
            }
            newUnionChildren.sort((a, b) =>
              a
                .getFullText(sourceFile)
                .localeCompare(b.getFullText(sourceFile), undefined, {
                  numeric: true,
                  sensitivity: 'base'
                })
            )
            const unionType = ts.factory.createUnionTypeNode(newUnionChildren)
            const alias = ts.factory.createTypeAliasDeclaration(
              child.modifiers,
              child.name,
              child.typeParameters,
              unionType
            )
            const newText = ts
              .createPrinter()
              .printNode(ts.EmitHint.Unspecified, alias, sourceFile)

            return newText
          } else {
            return child
          }
        })
        .reduce<string>(
          (prev, node) =>
            prev +
            (typeof node === 'string' ? node : node.getFullText(sourceFile)) +
            '\n',
          ''
        )

      return ts.createSourceFile(
        sourceFile.fileName,
        newSourceText,
        sourceFile.languageVersion
      )
    }

  // transform the source files
  const transformationResult = ts.transform(sourceFiles, [transformerFactory])

  // log the diagnostics if they exist
  if (
    transformationResult.diagnostics &&
    transformationResult.diagnostics.length
  ) {
    console.log(transformationResult.diagnostics)
  }

  for (const file of transformationResult.transformed) {
    writeFileSync(file.fileName, printer.printFile(file))
  }
  return
}
function name(node: ts.Node): string {
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isClassDeclaration(node)
  ) {
    return node.name?.text || ''
  } else {
    return ''
  }
}
