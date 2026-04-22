import {
    createStartHandler,
    defaultStreamHandler,
} from '@tanstack/react-start/server'
import { getRouter } from './router'

// createStartHandler({ createRouter }) returns a factory that accepts a stream handler.
export default createStartHandler({ createRouter: getRouter })(defaultStreamHandler)
