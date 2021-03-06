import { createBrowserHistory, History } from 'history'
import { Navigation } from './Navigation'
import { Chunk } from './Chunks'
import { Reducer } from './Reducer'
import { Router } from './Router'
import { Route, defaultRouteReducer } from './Route'
import { Observer, SimpleSubscription, createOrPassthroughObserver } from './Observable'
import { CurrentRouteObservable } from './CurrentRouteObservable';
import { Matcher } from './Matcher'


export interface BrowserNavigationOptions<Context extends object, R = Route> {
    /**
     * The Matcher that declares your app's pages.
     */
    routes?: Matcher<Context>,
    pages?: Matcher<Context>,

    /**
     * If provided, this part of any URLs will be ignored. This is useful
     * for mounting a Navi app in a subdirectory on a domain.
     */
    basename?: string,

    /**
     * This will be made available within your matcher through
     * the `env` object passed to any getter functions.
     */
    context?: Context,

    /**
     * You can manually supply a history object. This is useful for
     * integration with react-router.
     * 
     * By default, a browser history object will be created.
     */
    history?: History,

    /**
     * The function that reduces chunks into a Route object.
     */
    reducer?: Reducer<Chunk, R>,
}


export function createBrowserNavigation<Context extends object, R = Route>(options: BrowserNavigationOptions<Context, R>) {
    return new BrowserNavigation(options)
}


export class BrowserNavigation<Context extends object, R> implements Navigation<Context, R> {
    router: Router<Context, R>
    history: History

    private currentRouteObservable: CurrentRouteObservable<Context, R>

    constructor(options: BrowserNavigationOptions<Context, R>) {
        if (options.pages) {
            // if (process.env.NODE_ENV !== 'production') {
            //     console.warn(
            //         `Deprecation Warning: passing a "pages" option to "createBrowserNavigation()" will `+
            //         `no longer be supported from Navi 0.12. Use the "matcher" option instead.`
            //     )
            // }
            options.routes = options.pages
        }

        let reducer = options.reducer || defaultRouteReducer as any as Reducer<Chunk, R>

        this.history = options.history || createBrowserHistory()
        this.router = new Router({
            context: options.context,
            routes: options.routes!,
            basename: options.basename,
            reducer,
        })

        this.currentRouteObservable = new CurrentRouteObservable(
            this.history,
            this.router,
            reducer,
        )
    }

    dispose() {
        this.currentRouteObservable.dispose()
        delete this.currentRouteObservable
        delete this.router
        delete this.history
    }

    setContext(context: Context) {
        this.currentRouteObservable.setContext(context)
    }

    getCurrentValue(): R {
        return this.currentRouteObservable.getValue()
    }

    getSteadyValue(): Promise<R> {
        return this.currentRouteObservable.getSteadyRoute()
    }

    async steady() {
        await this.getSteadyValue()
        return
    }

    /**
     * If you're using code splitting, you'll need to subscribe to changes to
     * the snapshot, as the route may change as new code chunks are received.
     */
    subscribe(
        onNextOrObserver: Observer<R> | ((value: R) => void),
        onError?: (error: any) => void,
        onComplete?: () => void
    ): SimpleSubscription {
        let navigationObserver = createOrPassthroughObserver(onNextOrObserver, onError, onComplete)
        return this.currentRouteObservable.subscribe(navigationObserver)
    }
}
