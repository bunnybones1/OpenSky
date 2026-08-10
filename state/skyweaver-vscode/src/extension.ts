import * as vscode from 'vscode'
import * as fs from 'fs/promises'
import * as path from 'path'

const CARD_REGEX = /^c\d{1,5}.rs$/

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('skyweaver-vscode.previewCard', () => {
      CardPreviewPanel.createOrShow()
    }),
    vscode.commands.registerCommand('skyweaver-vscode.searchCard', searchCard),
    vscode.window.onDidChangeActiveTextEditor(editor => {
      const panel = CardPreviewPanel.singleton
      if (panel && editor) {
        const filePath = path.resolve(editor.document.fileName)
        const fileName = path.basename(filePath)
        if (!CARD_REGEX.test(fileName)) {
          return
        }
        const cardID = Number.parseInt(
          fileName.replace('c', '').replace('.rs', ''),
          10
        )
        if (!Number.isInteger(cardID)) {
          return
        }
        getWorkspaceCardLibrary().then(library => {
          const card = library?.find(c => c.id === cardID)
          if (!card) {
            return
          }
          const metadata = jsonCardToMetadata(card)
          let attachMetadata = undefined
          if (metadata.attachedSpellID !== undefined) {
            const attachCard = library?.find(c => c.id === cardID)
            if (attachCard) {
              attachMetadata = jsonCardToMetadata(attachCard)
            }
          }
          panel.setCardMetadata(metadata, attachMetadata)
        })
      }
    })
  )
}

export function deactivate() {}

class CardPreviewPanel {
  public static singleton: CardPreviewPanel | undefined

  public static readonly viewType = 'cardPreview'

  private readonly _panel: vscode.WebviewPanel
  private _disposables: vscode.Disposable[] = []

  public static createOrShow() {
    const column =
      vscode.window.activeTextEditor &&
      vscode.window.activeTextEditor.viewColumn
        ? vscode.window.activeTextEditor.viewColumn + 1
        : vscode.ViewColumn.Two

    // If we already have a panel, show it.
    if (CardPreviewPanel.singleton) {
      CardPreviewPanel.singleton._panel.reveal(column)
      return
    }

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      CardPreviewPanel.viewType,
      'Card Preview',
      column,
      webviewOptions
    )

    CardPreviewPanel.singleton = new CardPreviewPanel(panel)
  }

  public static revive(panel: vscode.WebviewPanel) {
    CardPreviewPanel.singleton = new CardPreviewPanel(panel)
  }

  private constructor(panel: vscode.WebviewPanel) {
    this._panel = panel

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables)

    this._panel.webview.html = `
			<!DOCTYPE html>
			<html lang="en"">
				<head>
					<meta charset="UTF-8">
					<title>Preview</title>
					<style>
						html { width: 100%; height: 100%; min-height: 100%; display: flex; }
						body { flex: 1; display: flex; }
						iframe { flex: 1; border: none; background: white; }
					</style>
				</head>
				<body>
					<iframe id="cardCreator" src="http://localhost:${3001}/game/?mode=LOCAL_BOT&test=cardCreator"></iframe>
					<script>
					  // Forward PostMessages to the child iframe :)
						const cardCreator = document.getElementById('cardCreator');
						window.addEventListener('message', e => {
              console.log(e.data)
							cardCreator.contentWindow.postMessage(e.data, '*')
						});
					</script>
				</body>
			</html>
		`
  }

  public setCardMetadata(metadata: object, attachMetadata: object | undefined) {
    this._panel.webview.postMessage({
      cardCreator: { metadata, attachMetadata }
    })
  }

  public dispose() {
    CardPreviewPanel.singleton = undefined

    this._panel.dispose()

    while (this._disposables.length) {
      const x = this._disposables.pop()
      if (x) {
        x.dispose()
      }
    }
  }
}

const webviewOptions: vscode.WebviewOptions = {
  enableScripts: true,
  localResourceRoots: []
}

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1)

function jsonCardToMetadata(jsonCard: JSONCard): CardMetadata {
  const {
    name,
    asset,
    backgroundAsset,
    type,
    prism,
    element,
    cost,
    traits,
    description,
    parsedDescription,
    power,
    health,
    spellBehaviour,
    attachedSpellID
  } = jsonCard

  return {
    name,
    asset,
    backgroundAsset,
    type: capitalize(type),
    prism: prism,
    element: element,
    cost: cost === 'no' || cost === 'X' ? cost : Number(cost) || 0,
    traits: (traits as string[]).map(capitalize),
    effectTypes: [],
    ...(description ? { description } : {}),
    ...(parsedDescription && parsedDescription.length
      ? { parsedDescription }
      : {}),
    power: power === 'X' ? power : Number(power) || 0,
    health: health === 'X' ? health : Number(health) || 0,
    canBePlayed: cost !== 'no',
    ...(typeof attachedSpellID === 'number'
      ? { attachedSpellID: String(attachedSpellID) }
      : {}),
    spellBehaviour: spellBehaviour || null
  }
}

async function getFirstWorkspaceFolderMatching<T>(
  transformer: (path: string) => Promise<T>
): Promise<T | undefined> {
  return (
    await Promise.all(
      vscode.workspace.workspaceFolders?.map(f => transformer(f.uri.fsPath)) ??
        []
    )
  ).filter(notEmpty)[0]
}

async function getWorkspaceCardLibrary(): Promise<Array<JSONCard> | undefined> {
  return getFirstWorkspaceFolderMatching(path =>
    findCardLibrary(path, 'design')
  )
}

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined
}

function findSkyweaverStateFolder(leaf: string): string | undefined {
  const leafPath = path.resolve(leaf)
  const pathToSkyweaverFolder = leafPath.split(path.sep).reduce(
    (acc, pathElement) => {
      if (!acc.done) {
        acc.path.push(pathElement)
        if (pathElement === 'SkyWeaver') {
          acc.done = true
        }
      }
      return acc
    },
    {
      path: [] as string[],
      done: false
    }
  )
  if (!pathToSkyweaverFolder.done) {
    return
  }

  const stateFolder = path.join(
    pathToSkyweaverFolder.path.join(path.sep),
    'state'
  )

  return stateFolder
}
/**
 *
 * @param leaf The path to any file within SkyWeaver/state.
 * @param type Design or prod card library?
 * @returns A Promise of Array of card jsons
 */
async function findCardLibrary(
  leaf: string,
  type: 'design' | 'prod'
): Promise<Array<JSONCard> | undefined> {
  const stateFolder = findSkyweaverStateFolder(leaf)
  if (!stateFolder) {
    return
  }
  const jsonPath = path.join(stateFolder, 'cards', `${type}.json`)
  try {
    return JSON.parse((await fs.readFile(jsonPath)).toString()).cards
  } catch {
    // no json file found, can't set up!
    return
  }
}
async function searchCard() {
  const cardLibrary = await getWorkspaceCardLibrary()
  if (!cardLibrary) {
    return // todo error
  }
  const quickPick = vscode.window.createQuickPick()
  quickPick.items = cardLibrary.map(c => ({
    label: c.name
  }))
  let selectedCardID: number | undefined
  quickPick.onDidChangeSelection(selection => {
    if (selection[0]) {
      const card = cardLibrary.find(c => c.name === selection[0].label)!
      selectedCardID = card.id
    }
  })
  quickPick.onDidAccept(async () => {
    quickPick.hide()
    if (selectedCardID !== undefined) {
      const stateFolderPath = await getFirstWorkspaceFolderMatching(async p =>
        findSkyweaverStateFolder(p)
      )
      if (!stateFolderPath) {
        return // todo error
      }
      const cardPath = path.join(
        stateFolderPath,
        'state',
        'src',
        'card_effects',
        `c${selectedCardID}.rs`
      )
      const openPath = vscode.Uri.file(cardPath)
      const doc = await vscode.workspace.openTextDocument(openPath)
      vscode.window.showTextDocument(doc)
    }
  })
  quickPick.onDidHide(() => quickPick.dispose())
  quickPick.show()
}

interface CardMetadata {
  name: string
  asset: string
  backgroundAsset: string
  attachedSpellID?: string
  cost: string | number
  prism: string
  element: string
  health: string | number
  power: string | number
  traits: string[]
  type: string
  canBePlayed: boolean
  description?: string
  parsedDescription?: object[]
  spellBehaviour: string | null
  effectTypes: string[]
}
interface JSONCard {
  id: number
  name: string
  asset: string
  backgroundAsset: string
  type: string
  prism: string
  element: string
  cost: string | number
  traits: string[]
  description: string
  parsedDescription: any[]
  power: string
  health: string
  spellBehaviour: string
  attachedSpellID?: string
}
