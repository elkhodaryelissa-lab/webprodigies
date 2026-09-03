import { combineReducers , configureStore, Middleware, ReducersMapObject} from "@reduxjs/toolkit";
import { slices } from "./slices";
import { Root } from "react-dom/client";
import middleware from "@/middleware";
import { apis } from "./api";
import { historyMiddleware } from "./middleware/history";

export type RootState= ReturnType<typeof rootReducer>;

const rootReducer = combineReducers({
    ...slices,
    ...apis.reduce((acc,api)=>{
        acc[api.reducerPath]= api.reducer
        return acc
    }, {}as ReducersMapObject),
})

export function makeStore(preloadedState?: Partial<RootState>){
    return configureStore({
        reducer: rootReducer,
        // BUG FIX: `preloadedState` was accepted as a parameter but never
        // actually passed into configureStore() here — so the server's
        // profile data (and anything else passed via ReduxProvider's
        // preloadedState prop) was silently discarded, and every client
        // store always started from each slice's default initialState.
        // This is why `state.profile.user` (and `me` in the navbar) was
        // undefined even though the server had the real profile.
        preloadedState,
        middleware :(gDM)=> gDM().concat(...apis.map((a)=>a.middleware as Middleware), historyMiddleware),
    })
}

export const store = makeStore()

export type AppStore = ReturnType<typeof makeStore>
export type AppDispatch = AppStore['dispatch']

// re-exported so `@/redux/store` also works as an import path for these
// (the actual typed hooks live in ./hooks)
export { useAppDispatch, useAppSelector, useAppStore } from './hooks'
