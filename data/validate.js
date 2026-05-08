// Validador minimalista compartido por los ficheros de data.
// No es un JSON Schema completo — solo valida tipo, requerido,
// y opcionalmente forma de subesquema (anidado o de array).
//
// Uso típico desde un fichero de data:
//
//   const SCHEMA = {
//     name: "alphabet entry",
//     fields: {
//       upper: { type: "string", required: true },
//       digraph: { type: "boolean", required: false },
//       syllables: { type: "array", of: { type: "string" }, required: true },
//     },
//   };
//   SUPEINGO_VALIDATE(SCHEMA, DATA);
//
// En tests podemos importar SUPEINGO_VALIDATE y reusar el SCHEMA
// + DATA exportados en window.SUPEINGO_CONTENT_META para confirmar
// que cualquier cambio futuro sigue cumpliendo el contrato.

(function () {
  const TYPE_OF = (v) => Array.isArray(v) ? "array" : (v === null ? "null" : typeof v);

  function checkValue(path, value, fieldSchema, errors) {
    const expected = fieldSchema.type;
    const actual = TYPE_OF(value);
    if (actual !== expected) {
      errors.push(`${path}: esperaba ${expected}, recibí ${actual} (${JSON.stringify(value)})`);
      return;
    }
    if (expected === "array" && fieldSchema.of) {
      value.forEach((item, i) => checkValue(`${path}[${i}]`, item, fieldSchema.of, errors));
    }
    if (expected === "object" && fieldSchema.fields) {
      checkObject(`${path}`, value, fieldSchema.fields, errors);
    }
  }

  function checkObject(path, obj, fields, errors) {
    if (TYPE_OF(obj) !== "object") {
      errors.push(`${path}: esperaba object, recibí ${TYPE_OF(obj)}`);
      return;
    }
    for (const [key, fs] of Object.entries(fields)) {
      const has = Object.prototype.hasOwnProperty.call(obj, key);
      if (!has) {
        if (fs.required) errors.push(`${path}.${key}: campo requerido ausente`);
        continue;
      }
      checkValue(`${path}.${key}`, obj[key], fs, errors);
    }
    // Aviso (no error) por campos extra no listados en el schema
    for (const key of Object.keys(obj)) {
      if (!Object.prototype.hasOwnProperty.call(fields, key)) {
        errors.push(`${path}.${key}: campo no declarado en schema (extra)`);
      }
    }
  }

  // Valida que `data` (array u objeto) cumple `schema`.
  // Devuelve { ok, errors }. En consola muestra un resumen legible.
  function validate(schema, data) {
    const errors = [];
    if (Array.isArray(data)) {
      data.forEach((item, i) => checkObject(`${schema.name}[${i}]`, item, schema.fields, errors));
    } else {
      checkObject(schema.name, data, schema.fields, errors);
    }
    if (errors.length) {
      // No lanzamos para no romper el mock; sí lo gritamos en consola.
      console.error(`[supeingo:data] ${schema.name}: ${errors.length} error(es) de schema`);
      errors.slice(0, 20).forEach(e => console.error("  -", e));
      if (errors.length > 20) console.error(`  ... y ${errors.length - 20} más`);
    }
    return { ok: errors.length === 0, errors };
  }

  // Registro de schemas para que tests externos (o la consola) puedan
  // re-validar todo: window.SUPEINGO_CONTENT_META = { alphabet: { schema, data }, ... }
  function register(key, schema, data) {
    window.SUPEINGO_CONTENT_META = window.SUPEINGO_CONTENT_META || {};
    window.SUPEINGO_CONTENT_META[key] = { schema, data };
  }

  window.SUPEINGO_VALIDATE = validate;
  window.SUPEINGO_REGISTER = register;
})();
