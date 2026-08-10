import { Action, IDraggable, IDropTarget, IGlobalAttributes } from 'flexlayout-react'

export type IBorderLocation = 'top' | 'bottom' | 'left' | 'right'
export type ITabLocation = 'top' | 'bottom'
export type IInsets = {
  top: number
  right: number
  bottom: number
  left: number
}
export interface IJsonModel<T extends NodeMeta> {
  global?: IGlobalAttributes
  borders?: IJsonBorderNode<T>[]
  layout: IJsonRowNode<T>
}
export interface IJsonBorderNode<T extends NodeMeta> extends IBorderAttributes {
  location: IBorderLocation
  children: IJsonTabNode<T>[]
}
export interface IJsonRowNode<T extends NodeMeta> extends IRowAttributes {
  children: (IJsonRowNode<T> | IJsonTabSetNode<T>)[]
}
export interface IJsonTabSetNode<T extends NodeMeta> extends ITabSetAttributes {
  active?: boolean
  maximized?: boolean
  children: IJsonTabNode<T>[]
}
export type IJsonTabNode<T extends NodeMeta> = ITabAttributes<T>
export interface IRowAttributes {
  height?: number
  id?: string
  type: 'row'
  weight?: number
  width?: number
}
export interface ITabSetAttributes {
  autoSelectTab?: boolean
  borderInsets?: IInsets
  classNameHeader?: string
  classNameTabStrip?: string
  config?: any
  enableClose?: boolean
  enableDeleteWhenEmpty?: boolean
  enableDivide?: boolean
  enableDrag?: boolean
  enableDrop?: boolean
  enableMaximize?: boolean
  enableTabStrip?: boolean
  headerHeight?: number
  height?: number
  id?: string
  marginInsets?: IInsets
  minHeight?: number
  minWidth?: number
  name?: string
  selected?: number
  tabLocation?: ITabLocation
  tabStripHeight?: number
  type: 'tabset'
  weight?: number
  width?: number
}
export type ITabAttributes<T extends NodeMeta> = T & {
  altName?: string
  borderHeight?: number
  borderWidth?: number
  className?: string
  enableClose?: boolean
  enableDrag?: boolean
  enableFloat?: boolean
  enableRename?: boolean
  enableRenderOnDemand?: boolean
  floating?: boolean
  helpText?: string
  icon?: string
  id?: string
  name?: string
  type: 'tab'
}

export interface IBorderAttributes {
  autoSelectTabWhenClosed?: boolean
  autoSelectTabWhenOpen?: boolean
  barSize?: number
  className?: string
  config?: any
  enableAutoHide?: boolean
  enableDrop?: boolean
  minSize?: number
  selected?: number
  show?: boolean
  size?: number
  type: 'border'
}

type NodeMeta = {
  component: string
} & (
  | {
      config: NonNullable<unknown>
    }
  | {
      config?: never
    }
)

export function validateModelAgainstType<const T extends NodeMeta>(
  model: IJsonModel<T>
): IJsonModel<T> {
  return model
}

export interface Layout<T extends NodeMeta> {
  /**
   * Adds a new tab to the given tabset
   * @param tabsetId the id of the tabset where the new tab will be added
   * @param json the json for the new tab node
   */
  addTabToTabSet(tabsetId: string, json: IJsonTabNode<T>): void
  /**
   * Adds a new tab to the active tabset (if there is one)
   * @param json the json for the new tab node
   */
  addTabToActiveTabSet(json: IJsonTabNode<T>): void
  /**
   * Adds a new tab by dragging a labeled panel to the drop location, dragging starts immediatelly
   * @param dragText the text to show on the drag panel
   * @param json the json for the new tab node
   * @param onDrop a callback to call when the drag is complete (node and event will be undefined if the drag was cancelled)
   */
  addTabWithDragAndDrop(
    dragText: string | undefined,
    json: IJsonTabNode<T>,
    onDrop?: (node?: Node<T>, event?: Event) => void
  ): void
  /**
   * Move a tab/tabset using drag and drop
   * @param node the tab or tabset to drag
   * @param dragText the text to show on the drag panel
   */
  // TODO impl
  // moveTabWithDragAndDrop(node: (TabNode | TabSetNode), dragText?: string): void;
  /**
   * Adds a new tab by dragging a labeled panel to the drop location, dragging starts when you
   * mouse down on the panel
   *
   * @param dragText the text to show on the drag panel
   * @param json the json for the new tab node
   * @param onDrop a callback to call when the drag is complete (node and event will be undefined if the drag was cancelled)
   */
  addTabWithDragAndDropIndirect(
    dragText: string | undefined,
    json: IJsonTabNode<T>,
    onDrop?: (node?: Node<T>, event?: Event) => void
  ): void

  /**
   * @internal
   * smelly internal stuff :D
   */
  doAction(action: Action): Node<T> | undefined
}

/**
 * Class containing the Tree of Nodes used by the FlexLayout component
 */
export interface Model<T extends NodeMeta> {
  /**
   * Get the currently active tabset node
   */
  getActiveTabset(): TabSetNode<T> | undefined
  /**
   * Get the currently maximized tabset node
   */
  getMaximizedTabset(): TabSetNode<T> | undefined
  /**
   * Gets the root RowNode of the model
   * @returns {RowNode<T>}
   */
  getRoot(): RowNode<T>
  isRootOrientationVertical(): boolean
  isUseVisibility(): boolean
  // /**
  //  * Gets the
  //  * @returns {BorderSet|*}
  //  */
  // getBorderSet(): BorderSet
  /**
   * Visits all the nodes in the model and calls the given function for each
   * @param fn a function that takes visited node and a integer level as parameters
   */
  visitNodes(fn: (node: Node<T>, level: number) => void): void
  /**
   * Gets a node by its id
   * @param id the id to find
   */
  getNodeById(id: string): Node<T> | undefined
  /**
   * Update the node tree by performing the given action,
   * Actions should be generated via static methods on the Actions class
   * @param action the action to perform
   * @returns added Node for Actions.addNode; undefined otherwise
   */
  doAction(action: Action): Node<T> | undefined
  /**
   * Converts the model to a json object
   * @returns {IJsonModel<T>} json object that represents this model
   */
  toJson(): IJsonModel<T>
  getSplitterSize(): number
  isLegacyOverflowMenu(): boolean
  getSplitterExtra(): number
  isEnableEdgeDock(): boolean
  // /**
  //  * Sets a function to allow/deny dropping a node
  //  * @param onAllowDrop function that takes the drag node and DropInfo and returns true if the drop is allowed
  //  */
  // setOnAllowDrop(
  //   onAllowDrop: (dragNode: Node<T>, dropInfo: DropInfo) => boolean
  // ): void
  /**
   * set callback called when a new TabSet is created.
   * The tabNode can be undefined if it's the auto created first tabset in the root row (when the last
   * tab is deleted, the root tabset can be recreated)
   * @param onCreateTabSet
   */
  // setOnCreateTabSet(onCreateTabSet: (tabNode?: TabNode<T>) => ITabSetAttributes): void
  toString(): string
}

export interface TabSetNode<T extends NodeMeta>
  extends Node<T>,
    IDraggable,
    IDropTarget {
  getName(): string | undefined
  getSelected(): number
  getSelectedNode(): Node<T> | undefined
  getWeight(): number
  getWidth(): number | undefined
  getMinWidth(): number
  getHeight(): number | undefined
  getMinHeight(): number
  /**
   * Returns the config attribute that can be used to store node specific data that
   * WILL be saved to the json. The config attribute should be changed via the action Actions.updateNodeAttributes rather
   * than directly, for example:
   * this.state.model.doAction(
   *   FlexLayout.Actions.updateNodeAttributes(node.getId(), {config:myConfigObject}));
   */
  getConfig(): any
  isMaximized(): boolean
  isActive(): boolean
  isEnableDeleteWhenEmpty(): boolean
  isEnableDrop(): boolean
  isEnableDrag(): boolean
  isEnableDivide(): boolean
  isEnableMaximize(): boolean
  isEnableClose(): boolean
  canMaximize(): boolean
  isEnableTabStrip(): boolean
  isAutoSelectTab(): boolean
  getClassNameTabStrip(): string | undefined
  getClassNameHeader(): string | undefined
  getHeaderHeight(): number
  getTabStripHeight(): number
  getTabLocation(): string
  toJson(): IJsonTabSetNode<T>
}

export interface Node<T extends NodeMeta> {
  getId(): string
  getModel(): Model<T>
  getType(): string
  getParent(): Node<T> | undefined
  getChildren(): Node<T>[]
  // getRect(): Rect;
  isVisible(): boolean
  // getOrientation(): Orientation;
  setEventListener(event: string, callback: (params: any) => void): void
  removeEventListener(event: string): void
}

export interface RowNode<T extends NodeMeta> extends Node<T>, IDropTarget {
  getWeight(): number
  getWidth(): number | undefined
  getHeight(): number | undefined
  toJson(): IJsonRowNode<T>
  isEnableDrop(): boolean
}
