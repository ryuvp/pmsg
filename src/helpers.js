// helpers.js
export function normalizeRelations(data, relations) {
  return {
    ...data,
    ...relations.reduce(
      (prev, relation) => ({
        ...prev,
        [relation.attribute] : Array.isArray(data[relation.attribute]) ?
          data[relation.attribute].map(x => x.id) : data[relation.attribute].id
      }), {}
    )
  };
}
export function resolveRelations(data, state, rootGetters, level=1) {
  if(state.relations.length==0){
    return data
  }else{

    return {
      ...data,
      ...state.relations.reduce(
        (prev, relation) => {
          let alias = relation.alias != undefined ? relation.alias : relation.attribute

          if(state.maxRelationsResolve>=level){
            return ({
              ...prev,
              [alias] : relationLinck(data, alias, relation, state.key, rootGetters, level+1)
            })
          }
          else{
            return ({
              ...prev,
              ['errorResolve'] : 'Max relation resolve exceded: resolved '+level+' times'
            })
          }

        }, {}
      )
    };
  }
}

function relationLinck(data, alias, relation, key, rootGetters, level) {
  if (relation.hasMany === false) {
    return Array.isArray(data[relation.alias]) ?
      data[relation.alias].map(x => {return {...rootGetters[`${relation.module}/find`](x, level),pivot_id: x}}) :
      {...rootGetters[`${relation.module}/find`](data[relation.attribute], level),pivot_id: data[relation.attribute]}
  } else {
    return rootGetters[`${relation.module}/filter`](d => d[relation.attribute] === data[key], level)
  }
}

//esta funcion se usa para exportar las relaciones de un objeto
export function exportRelations(data, state, dispatch, rootGetters) {
  if(data.pivot!==undefined){
    delete data.pivot
  }
  if(state.relations.length==0){
    return data
  }else
    return {
      ...data,
      ...state.relations.reduce(
        (prev, relation) => {
          let attr = data[relation.alias]
          if (attr !== undefined&&attr !== null) {
            if(Array.isArray(attr)){
              prev[relation.alias]= attr.map(obj => obj[rootGetters[`${relation.module}/key`]])
              dispatch(`${relation.module}/syncItems`, attr, { root: true })
            }
            else if (typeof attr == 'object' || attr instanceof Object){
              delete prev[relation.attribute]
              dispatch(`${relation.module}/syncItem`, attr, { root: true })
            }
            return ({
              ...prev
            })
          }
          else {
            return { ...prev }
          }
        }, {}
      )
    };
}

//esta funcion se usa para exportar las relaciones de un arreglo de objetos
export function globalExportRelations(items, relations, dispatch, rootGetters) {
  if(relations.length==0){
    return items
  }
  relations=relations.map(d=>{return {...d,pivot: []}})
  items=items.map(item => {
    if(item.pivot!==undefined){
      delete item.pivot
    }
    return {
      ...item,
      ...relations.reduce(
        (prev, relation, currentIndex) => {
          let attr = item[relation.alias]
          if (attr !== undefined&&attr !== null) {
            if(Array.isArray(attr)){
              prev[relation.alias]= attr.map(obj => obj[rootGetters[`${relation.module}/key`]])
              relations[currentIndex].pivot = relations[currentIndex].pivot.concat(attr)
            }
            else if (typeof attr == 'object' || attr instanceof Object){
              delete prev[relation.attribute]
              relations[currentIndex].pivot.push(attr)
            }
            return ({
              ...prev
            })
          }
          else {
            return { ...prev }
          }
        }, {}
      )
    };
  })
  relations.forEach( (relation) =>{
    if(relation.pivot.length>0){
      dispatch(`${relation.module}/sync`, relation.pivot, { root: true })
    }
  })
  return items
}


export function areObjEquals(foo, bar) {
  let equal = true;

  for (let [key, val] of Object.entries(foo)) {
    if (Object.prototype.hasOwnProperty.call(bar, key))   {
      if (bar[key] !== val) {
        equal = false;
      }
    } else {
      equal = false;
    }

    if (!equal) { break; }
  }

  return equal;
}