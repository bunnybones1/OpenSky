import UpdateManager from '../UpdateManager'
import GeneralInput from './GeneralInput'
import MouseInput from './MouseInput'
import TouchInput from './TouchInput'
import { UnderPointer } from './UnderPointer'

const inputProvider = new GeneralInput()
UpdateManager.register(inputProvider)
export const touchInput = new TouchInput(inputProvider)
export const mouseInput = new MouseInput(inputProvider)
export const underPointer = new UnderPointer(inputProvider)
export default inputProvider
