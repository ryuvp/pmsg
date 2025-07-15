import { md5 } from 'js-md5'
import createModelStore from "./useModelStore"
import axios from 'axios'
export default class Model {

  constructor(config, instance = null) {
    this.instance = instance == null ? axios.create() : instance//axios instance
    let defaultValues = {
      alias               : null,// Alias utilizado para almacenar en el localstorage
      route               : null,// Ruta donde se encuentra el resource
      hash                : false,// La condicional si se va a validar el md5
      sync                : false,// La condicional si se va sincronizar o reemplazar el state al hacer un nuevo request
      store               : false,// La condicional que define si se guardara en el localstorage
      methods             : null, // Define los métodos adicionales utilizados por el modelo
      /*config for storeDefault*/
      hasKey              : true,// Define si la tabla tiene primaryKey
      key                 : 'id',// Define el primary key que se usara para acceder al objeto
      name                : 'name',// Nombre del atributo name en la base de datos
      maxRelationsResolve : 1,// Relaciones con otros models
      relations           : [],// Relaciones con otros models
      selectable          : false,// Condicional para definir si el objeto es seleccionable
      default             : {},// Valor del objeto por defecto,
      params              : { modeljs: true },// Aquí se configuran parámetros adicionales a enviar en los request excepto DELETE
      modelGetters        : {},// Aquí se configuran parámetros adicionales a enviar en los request excepto DELETE
      paginate            : false,// Condicional para definir si el modelo tiene paginación
      pagination          : {current_page: 1, per_page: 10},// Configuración de paginación
    }
    //config.hasKey=config.hasKey!=undefined?config.hasKey:config.key!=undefined
    defaultValues = Object.assign(defaultValues, config)
    this.alias = defaultValues.alias
    this.route = defaultValues.route
    this.hash = defaultValues.hash
    this.sync = defaultValues.sync
    this.store = defaultValues.store
    for (const prop in defaultValues.methods) {
      this[prop] = defaultValues.methods[prop]
    }
    this.singular = defaultValues.singular
    this.plural = defaultValues.plural
    this.key = defaultValues.key
    this.hasKey = defaultValues.hasKey
    this.name = defaultValues.name
    this.maxRelationsResolve = defaultValues.maxRelationsResolve
    this.relations = defaultValues.relations
    this.selectable = defaultValues.selectable
    this.default = defaultValues.default
    this.params = defaultValues.params
    this.modelGetters = defaultValues.modelGetters
    this.paginate = defaultValues.paginate
    this.pagination = defaultValues.pagination
    this.state = {}
    this.getters = {}
    this.actions = {}
  }

  get(url = '', params = {}) {
    params = Object.assign(params, this.params)
    url = this.route + '/' + url
    return this.instance.get(url, params)
  }

  post(url = '', params = {}) {
    params = Object.assign(params, this.params)
    url = this.route + '/' + url
    return this.instance.post(url, params)
  }

  // Función para obtener el listado de Objetos de la base de datos
  getAll(params = {}) {
    params = Object.assign(params, this.params)
    return this.instance.get(this.route, params)
  }

  // Función para crear un objeto en la base de datos
  create(d) {
    d = Object.assign(d, this.params)
    return this.instance.post(this.route, d)
  }

  // Función para mostrar un objeto de la base de datos
  show(params) {
    let id = null
    let d = this.params
     
    if (typeof params === 'object') {
      id = params[this.key]
      d = Object.assign(params, this.params)
    } else {
      id = params
    }
    return this.instance.get(this.route + '/' + id, {
      params : d,
    })
  }

  // Función para actualizar un objeto en la base de datos
  update(d) {
    d = Object.assign(d, this.params)
    return this.instance.put(this.route + '/' + d[this.key], d)
  }

  // Función para eliminar un objeto de la base de datos
  delete(d) {
    return this.instance.delete(this.route + '/' + d[this.key], {
      params : this.params,
    })
  }

  // Función para verificar si la lista esta guardada en el local storage
  async saved(params = {}) {
    if (this.store) {
      if (this.hash) {
        await this.verificarHash(params)
      }
      return !!localStorage.getItem(this.alias)
    } else
      return this.store
  }

  // Función para almacenar la lista en el localstorage
  save(p) {
    if (this.store) {
      localStorage.setItem(this.alias, JSON.stringify(p))
    }
  }

  // Función para obtener lo almacenado en el localStorage
  getFromLocalStorage() {
    return JSON.parse(localStorage.getItem(this.alias))
  }

  // Función para eliminar lo  almacenado en el localstorage
  destroy() {
    localStorage.removeItem(this.alias)
  }

  // Función para verificar si el hash coincide con el que viene en la vista
  async verificarHash (params = {}) {
    let hashMd5 = await this.getAll({...params, hash: true})
    if (!!localStorage.getItem(this.alias) && hashMd5.data !== md5(localStorage.getItem(this.alias))) {
      localStorage.removeItem(this.alias)
    }
  }

  // Getter para obtener el store por defecto para el modelo
  setStore({ state = null, getters = null, actions = null }) {
    this.state = state === null ? this.state : state
    this.getters = getters === null ? this.getters : getters
    this.actions = actions === null ? this.actions : actions
    return this
  }
  // Getter para obtener el store por defecto para el modelo
  getStore(state = null, getters = null, actions = null) {
    this.state = state === null ? this.state : state
    this.getters = getters === null ? this.getters : getters
    this.actions = actions === null ? this.actions : actions
    return createModelStore(this, this.state, this.getters, this.actions)
  }

  // Getter para obtener todos los parámetros de configuración del modelo
  getConfig() {
    return {
      sync       : this.sync,
      alias      : this.alias,
      route      : this.route,
      hash       : this.hash,
      store      : this.store,
      methods    : this.methods,
      singular   : this.singular,
      plural     : this.plural,
      key        : this.key,
      name       : this.name,
      selectable : this.selectable,
      default    : this.default
    }
  }

  // Función para obtener los parámetros de configuración necesarios para el StoreDefault
  getStoreConfig() {
    return {
      key                 : this.key,
      hasKey              : this.hasKey,
      moduleAlias         : this.alias,
      maxRelationsResolve : this.maxRelationsResolve,
      relations           : this.relations.map(relation => {
        return {
          ...relation,
          ['hasMany'] : (relation.hasMany === undefined) ? false : relation.hasMany,
          ['alias']   : (relation.alias === undefined) ? relation.attribute : relation.alias,

        }
      }),
      sync       : this.sync,
      paginate   : this.paginate,
      pagination : this.pagination,
    }
  }

  // Getter para saber si se puede seleccionar un objeto de la lista de objetos
  isSelectable() {
    return this.selectable === true
  }

  // Getter para obtener el valor por default de el objeto
  getDefault() {
    //return JSON.parse(JSON.stringify(this.default))
    //return {...Object.assign({},this.default),...this.getModelGetters()}
    return Object.assign({}, JSON.parse(JSON.stringify(this.default)))
  }
  // Getter para obtener el valor por default de el objeto modelGetters
  getModelGetters() {
    return Object.assign({}, JSON.parse(JSON.stringify(this.modelGetters)))
  }

  // Getter para obtener el nombre del atributo que hace referencia al nombre del Objeto
  getNameAttribute() {
    return this.name
  }
}

