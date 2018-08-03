import {Action as Act, ActionContext, Module as Mod, Mutation as Mut, Payload} from 'vuex'
/**
 * Parameters that can be passed to the @Action decorator
 */
export interface ActionDecoratorParams {
  commit?: string;
  cache:boolean;
  cacheName?:string;
}

function addMutation<T>(name:string,module:Mod<T, any>,context:ActionContext<any,any>){
  const stateName = `CACHE_${name.toUpperCase()}_LIST`
  if(!module.state){
    (module as any).state = {}
  }

  if(!module.state[stateName]){
    module.state[stateName] = new Map()
  }
  const mutationName = `SET_CACHE_${name.toUpperCase()}_LIST`
  if (!module.mutations) {
    module.mutations = {}
  }
  if(!module.mutations[mutationName]){
    const mutationFunction = (state,payload)=>{
      if(!context.state[stateName].has(payload.key)){
        context.state[stateName].set(payload.key,payload.response)
      }
    }
    const mutation = function (state, payload: Payload) {
      mutationFunction.call(state, payload)
    }
    module.mutations = Object.assign({},module.mutations,{[mutationName]:mutation})
  }
  return {stateName,mutationName}
}
function cacheActionDecoratorFactory<T> (params?: ActionDecoratorParams): MethodDecorator {
  return function (target: T, key: string | symbol, descriptor: TypedPropertyDescriptor<any>) {
    const module = target.constructor as Mod<T, any>
    if (!module.actions) {
      module.actions = {}
    }
    const actionFunction: Function = descriptor.value
    const action: Act<typeof target, any> = async function (context: ActionContext<typeof target, any>, payload: Payload) {
      try {
        const name = (module as any).name
        // const {stateName,mutationName} = addMutation(name,module,context)
        if(params && params.cache){
          // 请求查询字符key
          const requestKey = JSON.stringify(payload)
          if(!context.rootState.cache.cachelist.has(requestKey)){
            // send request!
            const actionPayload = await actionFunction.call(context, payload)
            context.commit('cache/setList',{response:actionPayload,key:requestKey},{root:true})
          }
          return context.rootState.cache.cachelist.get(requestKey)
        }

        const actionPayload = await actionFunction.call(context, payload)

        if (params) {
          if (params.commit) {
            context.commit(params.commit, actionPayload)
          }
        }

        return actionPayload



      } catch (e) {
        console.error('Could not perform action ' + key.toString())
        console.error(e)
      }
    }
    module.actions = Object.assign({},module.actions,{[key]:action})
    // module.actions[key] = action
  }
}

export function CacheAction<T, R> (target: T, key: string | symbol, descriptor: TypedPropertyDescriptor<(...args: any[]) => R>): void
export function CacheAction<T> (params: ActionDecoratorParams): MethodDecorator

/**
 * /**
 * The @Action decorator turns an async function into an Vuex action
 *
 * @param targetOrParams the module class
 * @param key name of the action
 * @param descriptor the action function descriptor
 * @constructor
 */
export function CacheAction<T, R> (targetOrParams: T | ActionDecoratorParams, key?: string | symbol, descriptor?: TypedPropertyDescriptor<(...args: any[]) => R>) {
  if (!key && !descriptor) {
    /*
     * This is the case when `targetOrParams` is params.
     * i.e. when used as -
     * <pre>
        @Action({commit: 'incrCount'})
        async getCountDelta() {
          return 5
        }
     * </pre>
     */
    return cacheActionDecoratorFactory(targetOrParams as ActionDecoratorParams)
  } else {
    /*
     * This is the case when @Action is called on action function
     * without any params
     * <pre>
     *   @Action
     *   async doSomething() {
     *    ...
     *   }
     * </pre>
     */
    cacheActionDecoratorFactory()(targetOrParams, key, descriptor)
  }
}
