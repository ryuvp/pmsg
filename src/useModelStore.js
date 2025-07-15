//import { resolveRelations, exportRelations, globalExportRelations, areObjEquals } from "./helpers"
import { areObjEquals } from "./helpers";
// import {  reactive, computed } from 'vue';


export default function createModelStore (model, state = {}, getters = {}, actions = {}) {
  const defData = {
    key : 'id',
  }
  const config = Object.assign(defData, model.getStoreConfig())
  let check =(d,data)=>{return d[config.key] === data[config.key]}
  if ( config.hasKey){
    if(Array.isArray(config.key)){
      let check_str = config.key.reduce((a, key)=>a+` d['${key}'] === data['${key}'] &&`,'(d,data)=>{return')
      check_str = check_str.substring(0, check_str.length-2)
      check_str+='}'
      check = eval(check_str)
    }
  }else{
    console.warn(`El modulo ${config.moduleAlias} no tiene Keys, esto reducira el rendimiento` )
    check=(d,data)=>{
      return areObjEquals(d,data)
    }
  }
  const resolveR = (item) => item
  return {
    state : {
      itemSelected        : { loading: false, ...model.getDefault() },
      items               : [],
      keysAsinc           : [],
      keysTemp            : [],
      key                 : config.key,
      moduleAlias         : config.moduleAlias,
      maxRelationsResolve : config.maxRelationsResolve,
      relations           : config.relations,
      syncStatus          : config.sync,
      paginate            : config.paginate,  
      pagination          : config.pagination,
      selectedStatus      : false,
      timeOutAsinc        : null,
      check               : check,
      ...state
    },
    getters : {
      // Getter para obtener el indice de la tabla
      //key     : ({key}) => { return key },
      // Getter para obtener el indice de la tabla
      default : () => { return model.getDefault() },
      // Getter para obtener el nombre del objeto seleccionado
      name    : ({ items, key }) => (id) => {
        const item = items.find(d => d[key] === id)
        return item ? item[model.getNameAttribute()] : null
      },
      // Getter para obtener el objeto seleccionado
      find : ({ items, key }) => (id, level = 1) => {
        const item = items.find(d => d[key] === id)
        return item ? resolveR(item, level):model.getDefault()
      },
      // Getter para obtener la lista de objetos
      list : ({items}) => {
        return items.map(resolveR)
      },
      // Getter para obtener la lista de objetos filtrados
      filter : ({items}) => (filter, level = 1) => {
        return items.filter(filter).map(item => resolveR(item, level))
      },
      // Getter para obtener el objeto seleccionado o falso si no hay seleccion
      selected : ({ itemSelected, selectedStatus }) => {
        return selectedStatus ? resolveR(itemSelected) : selectedStatus
      },
      ...getters
    },

    actions : {

      checkAsinc( key ){
        return new Promise((resolve) => {
          const fTime = () => {
            let keys=[]
            keys=keys.concat(this.keysTemp)
            if (Array.isArray(keys)) {
              this.keysAsinc = this.keysAsinc.concat(keys)
            } else {
              this.keysAsinc.push(keys)
            }
            this.keysTemp=[]
            let params={}
            params[this.key]=['IN'].concat(keys)
            this.getSome(params)
            this.timeOutAsinc = null
          }
          if (Array.isArray(key)) {
            let keys=key
            key.forEach((d,i)=>{
              if((this.items.findIndex(d1=>(d1[this.key]==d))!=-1)||(this.keysAsinc.indexOf(d)!=-1)||(this.keysTemp.indexOf(d)!=-1))
              {
                keys.splice(i,1)
              }
            })
            if(keys.length>0){
              this.keysTemp=this.keysTemp.concat(keys)
            }
            if(this.timeOutAsinc == null){
              this.timeOutAsinc = setTimeout(fTime, 100)
            }
            resolve( keys)
          }
          else{
            const item = this.find(key)
            if(item[this.key]==null){
              if(!this.keysAsinc.find(d=>d==key)&&!this.keysTemp.find(d=>d==key)){
                this.keysTemp.push(key)
              }
              if(this.timeOutAsinc == null){
                this.timeOutAsinc = setTimeout(fTime, 100)
              }
            }
            resolve(item)
          }
        })
      },
      // Action para obtener un registro por el (key) del servicor
      show(id){
        //var commit = store.commit
        return new Promise((resolve, reject) => {
          model.show(id).then(response => {
            this.syncItem(response.data)
            resolve(response);
          }).catch(reject);
        })
      },
      // Action para obtener la lista de objetos de el servidor
      async get (params = {}, pagination={}) {
      //var commit = store.commit
        const action = this.syncStatus ? 'sync' : 'setItems';
        
        if (model.paginate) {
          params = {...params, ...Object.assign({
            page : this.pagination.current_page, per_page : this.pagination.per_page
          }, pagination) };
        }
        if (!(await model.saved(params))) {
          return new Promise((resolve, reject) => {
            model.getAll(params).then(response => {
              const data = response.data;
              model.save(data.data);
              this[action](data.data);
              // eslint-disable-next-line no-unused-vars
              const { data: _, ...pagination } = data.meta;
              this.pagination = Object.assign(this.pagination, pagination);
              this.afterGet();
              console.log('get', this)
              resolve(response);
            }).catch(reject);
          })
        } else {
          this[action](model.getFromLocalStorage());
          this.afterGet();
        }
      },

      async getPage (params = {}, pagination={}) {
        //var commit = store.commit
        if (model.paginate) {
          params = {...params, ...Object.assign({
            page : this.pagination.current_page, per_page : this.pagination.per_page
          }, pagination) };
        }
        //console.log('getPage paginatios', this.pagination)
        //console.log('getPage', params)
        return this.get(params)

      },
      // Action para obtener la lista de algunos objetos de el servidor sin consultar ni almacenar en el localstorage
      getSome( params = {}){
        //var commit = store.commit
        return new Promise((resolve, reject) => {
          model.getAll(params).then(response => {
            this.sync(response.data);
            this.afterGet();
            resolve(response);
          }).catch(reject);
        })
      },
      // Action para limpiar el state y  obtener la lista de algunos objetos de el servidor
      clearAndGet(params = {}){
        return new Promise((resolve, reject) => {
          //  se agrega esta linea "dispatch('setItems', [])" para que al momento de cargar los nuevos datos la reactividad sea mas veloz
          // divide y vencceras
          this.setItems([]);
          model.getAll(params).then(response => {
            this.setItems(response.data);
            this.afterGet();
            resolve(response);
          }).catch(reject);
        })
      },
      // Action que se ejecuta después de obtener la lista de objetos
      afterGet(){
        //
      },

      // Action para crear un objeto en la base de datos y en la lista de objetos
      create( data){
        return new Promise((resolve, reject) => {
          model.create(data).then(response => {
            this.syncItem(response.data.data);
            resolve(response)
          }).catch(error => {
            reject(error)
          })
        })
      },

      // Action para actualizar un objeto en la base de datos y en la lista de objetos
      update( data){
        return new Promise((resolve, reject) => {
          model.update(data).then(response => {
            this.syncItem(response.data.data);
            resolve(response)
          }).catch(error => {
            reject(error)
          })
        })
      },

      // Action para eliminar un objeto de la base de datos y de la lista de objetos
      delete(data){
        return new Promise((resolve, reject) => {
          model.delete(data).then(response => {
            let index = this.items.findIndex(d => this.check(d,data))
            this.items.splice(index, 1)
            resolve(response)
          }).catch(error => {
            reject(error)
          })
        })
      },
      /*
      ***** action para setear objetos (items)  en el store ***
      */
      setItems (items)  {

        /* if(state.relations.length>0&&items.length>0){
        let relations = state.relations
        relations = relations.filter(relation=>{
          let alias = relation.alias != undefined ? relation.alias : relation.attribute
          return items[0][alias]!=undefined
        })
        //items = globalExportRelations(items, relations, dispatch, rootGetters)
      } */
        this.items = items
      },
      /*
      ***** action para setear el syncStatus ***
      */
      setSyncStatus( syncStatus){
        this.syncStatus = syncStatus
      },
      /*
      ***** action para determinar si se actualizara un objeto o varios de acuerdo al formato de llegada de la data ***
      */
      sync(data){
        if (typeof data === 'object' && data !== null) {
          if (Array.isArray(data)) {
            this.syncItems(data);
          } else {
            this.syncItem(data);
          }
        }
      },

      addToRelation({relation, id, relations}){
        if (this.relations.some(r=>r.alias==relation)) {
          let index = this.items.findIndex(d => d[this.key] === id)
          if(Array.isArray(relations)){
            this.items[index][relation] = this.items[index][relation].cocat(relations)
          }else{
            this.items[index][relation].push(relations)
          }
        }
      },
      /*
      ***** action para sincronizar objetos (items) con los objetos almacenado en el store ***
      */
      syncItems(items){
        //este filter elimina los valores duplicados
        items=items.filter((data, index, array)=>array.findIndex(d=>this.check(d,data)) === index)
        /* if(this.state.relations.length>0&&items.length>0){
          let relations = this.state.relations
          relations = relations.filter(relation=>{
            let alias = relation.alias != undefined ? relation.alias : relation.attribute
            return items[0][alias]!=undefined
          })
          items = globalExportRelations(items, relations, dispatch, rootGetters)
        } */
        let insert = items.filter( (item) =>{
          let i = this.items.findIndex(d=>this.check(d,item))
          if (i > -1) {
            this.items[i] = Object.assign(this.items[i], item)
            return false
          }else{
            return true
          }
        });
        this.items = this.items.concat(insert)
      },
      /*
      ***** action para sincronizar un objeto (item) con un objeto almacenado en el store ***
      */
      syncItem(item){
        // cambio this.state.items por this.items
        //item = resolveRelations(item, this.state, dispatch, rootGetters));
        if (this.find(item[this.key])[this.key] !== null && this.find(item[this.key])[this.key] !== undefined) {
          //UPDATE
          let index = this.items.findIndex(d => this.check(d,item))
          this.items[index] = Object.assign(this.items[index], item)
        } else {
          //CREATE
          this.items.push(item)
        }
      },
      setPageSize(pageSize){
        this.pagination.per_page = pageSize
      },
      
      /********* MUTACIONES COMO ACTIONS */
      // Mutation para setear el listado de objetos
      SET_ITEMS( items ){
        /* if(state.relations.length>0&&items.length>0){
          let relations = state.relations
          relations = relations.filter(relation=>{
            let alias = relation.alias != undefined ? relation.alias : relation.attribute
            return items[0][alias]!=undefined
          })
          items = globalExportRelations(items, relations, dispatch, rootGetters)
        } */
        this.items = items
      },

      ADD_ITEMS(items){
        if (Array.isArray(items)) {
          this.items = this.items.concat(items)
        } else {
          this.items.push(items)
        }
      },
      ...actions
    }
  };
}
