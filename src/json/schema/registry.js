"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const ajv = require("ajv");
const http = require("http");
const Observable_1 = require("rxjs/Observable");
const fromPromise_1 = require("rxjs/observable/fromPromise");
const of_1 = require("rxjs/observable/of");
const operators_1 = require("rxjs/operators");
const map_1 = require("rxjs/operators/map");
const utils_1 = require("../../utils");
const transforms_1 = require("./transforms");
const visitor_1 = require("./visitor");
class CoreSchemaRegistry {
    constructor(formats = []) {
        /**
         * Build an AJV instance that will be used to validate schemas.
         */
        this._uriCache = new Map();
        this._pre = new utils_1.PartiallyOrderedSet();
        this._post = new utils_1.PartiallyOrderedSet();
        const formatsObj = {};
        for (const format of formats) {
            formatsObj[format.name] = format.formatter;
        }
        this._ajv = ajv({
            removeAdditional: 'all',
            useDefaults: true,
            formats: formatsObj,
            loadSchema: (uri) => this._fetch(uri),
        });
        this._ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));
        this.addPostTransform(transforms_1.addUndefinedDefaults);
    }
    _fetch(uri) {
        const maybeSchema = this._uriCache.get(uri);
        if (maybeSchema) {
            return Promise.resolve(maybeSchema);
        }
        return new Promise((resolve, reject) => {
            http.get(uri, res => {
                if (!res.statusCode || res.statusCode >= 300) {
                    // Consume the rest of the data to free memory.
                    res.resume();
                    reject(`Request failed. Status Code: ${res.statusCode}`);
                }
                else {
                    res.setEncoding('utf8');
                    let data = '';
                    res.on('data', chunk => {
                        data += chunk;
                    });
                    res.on('end', () => {
                        try {
                            const json = JSON.parse(data);
                            this._uriCache.set(uri, json);
                            resolve(json);
                        }
                        catch (err) {
                            reject(err);
                        }
                    });
                }
            });
        });
    }
    /**
     * Add a transformation step before the validation of any Json.
     * @param {JsonVisitor} visitor The visitor to transform every value.
     * @param {JsonVisitor[]} deps A list of other visitors to run before.
     */
    addPreTransform(visitor, deps) {
        this._pre.add(visitor, deps);
    }
    /**
     * Add a transformation step after the validation of any Json. The JSON will not be validated
     * after the POST, so if transformations are not compatible with the Schema it will not result
     * in an error.
     * @param {JsonVisitor} visitor The visitor to transform every value.
     * @param {JsonVisitor[]} deps A list of other visitors to run before.
     */
    addPostTransform(visitor, deps) {
        this._post.add(visitor, deps);
    }
    _resolver(ref, validate) {
        if (!validate) {
            return {};
        }
        const refHash = ref.split('#', 2)[1];
        const refUrl = ref.startsWith('#') ? ref : ref.split('#', 1);
        if (!ref.startsWith('#')) {
            // tslint:disable-next-line:no-any
            validate = validate.refVal[validate.refs[refUrl[0]]];
        }
        if (validate && refHash) {
            // tslint:disable-next-line:no-any
            validate = validate.refVal[validate.refs['#' + refHash]];
        }
        return { context: validate, schema: validate && validate.schema };
    }
    compile(schema) {
        // Supports both synchronous and asynchronous compilation, by trying the synchronous
        // version first, then if refs are missing this will fails.
        // We also add any refs from external fetched schemas so that those will also be used
        // in synchronous (if available).
        let validator;
        try {
            const maybeFnValidate = this._ajv.compile(schema);
            validator = of_1.of(maybeFnValidate);
        }
        catch (e) {
            // Propagate the error.
            if (!(e instanceof ajv.MissingRefError)) {
                throw e;
            }
            validator = new Observable_1.Observable(obs => {
                this._ajv.compileAsync(schema)
                    .then(validate => {
                    obs.next(validate);
                    obs.complete();
                }, err => {
                    obs.error(err);
                });
            });
        }
        return validator
            .pipe(
        // tslint:disable-next-line:no-any
        map_1.map(validate => (data) => {
            let dataObs = of_1.of(data);
            this._pre.forEach(visitor => dataObs = dataObs.pipe(operators_1.concatMap(data => {
                return visitor_1.visitJson(data, visitor, schema, this._resolver, validate);
            })));
            return dataObs.pipe(operators_1.switchMap(updatedData => {
                const result = validate(updatedData);
                return typeof result == 'boolean'
                    ? of_1.of([updatedData, result])
                    : fromPromise_1.fromPromise(result
                        .then(result => [updatedData, result]));
            }), operators_1.switchMap(([data, valid]) => {
                if (valid) {
                    let dataObs = of_1.of(data);
                    this._post.forEach(visitor => dataObs = dataObs.pipe(operators_1.concatMap(data => {
                        return visitor_1.visitJson(data, visitor, schema, this._resolver, validate);
                    })));
                    return dataObs.pipe(map_1.map(data => [data, valid]));
                }
                else {
                    return of_1.of([data, valid]);
                }
            }), map_1.map(([data, valid]) => {
                if (valid) {
                    // tslint:disable-next-line:no-any
                    const schemaDataMap = new WeakMap();
                    schemaDataMap.set(schema, data);
                    return { data, success: true };
                }
                return {
                    data,
                    success: false,
                    errors: (validate.errors || [])
                        .map((err) => `${err.dataPath} ${err.message}`),
                };
            }));
        }));
    }
    addFormat(format) {
        // tslint:disable-next-line:no-any
        const validate = (data) => {
            const result = format.formatter.validate(data);
            return result instanceof Observable_1.Observable ? result.toPromise() : result;
        };
        this._ajv.addFormat(format.name, {
            async: format.formatter.async,
            validate,
        });
    }
}
exports.CoreSchemaRegistry = CoreSchemaRegistry;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2NvcmUvc3JjL2pzb24vc2NoZW1hL3JlZ2lzdHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsMkJBQTJCO0FBQzNCLDZCQUE2QjtBQUM3QixnREFBNkM7QUFDN0MsNkRBQTBEO0FBQzFELDJDQUF3RDtBQUN4RCw4Q0FBc0Q7QUFDdEQsNENBQXlDO0FBQ3pDLHVDQUFrRDtBQVNsRCw2Q0FBb0Q7QUFDcEQsdUNBQW1EO0FBR25EO0lBTUUsWUFBWSxVQUEwQixFQUFFO1FBQ3RDOztXQUVHO1FBUEcsY0FBUyxHQUFHLElBQUksR0FBRyxFQUFzQixDQUFDO1FBQzFDLFNBQUksR0FBRyxJQUFJLDJCQUFtQixFQUFlLENBQUM7UUFDOUMsVUFBSyxHQUFHLElBQUksMkJBQW1CLEVBQWUsQ0FBQztRQU9yRCxNQUFNLFVBQVUsR0FBd0MsRUFBRSxDQUFDO1FBRTNELEdBQUcsQ0FBQyxDQUFDLE1BQU0sTUFBTSxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDN0IsVUFBVSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDO1FBQzdDLENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQztZQUNkLGdCQUFnQixFQUFFLEtBQUs7WUFDdkIsV0FBVyxFQUFFLElBQUk7WUFDakIsT0FBTyxFQUFFLFVBQVU7WUFDbkIsVUFBVSxFQUFFLENBQUMsR0FBVyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBeUI7U0FDdEUsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLHdDQUF3QyxDQUFDLENBQUMsQ0FBQztRQUUzRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUNBQW9CLENBQUMsQ0FB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RUFBRSxDQUFDO3lCQUM1QixHQUFHLENBQUMsQ0FBQyxHQUFvQixFQUFFLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxRQUFRLElBQUksR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO2lCQUMxQyxDQUFDO1lBQzdCLENBQUMsQ0FBQyxDQUNILENBQUM7UUFDSixDQUFDLENBQUMsQ0FDSCxDQUFDO0lBQ04sQ0FBQztJQUVELFNBQVMsQ0FBQyxNQUFvQjtRQUM1QixrQ0FBa0M7UUFDbEMsTUFBTSxRQUFRLEdBQUcsQ0FBQyxJQUFTLEVBQUUsRUFBRTtZQUM3QixNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUUvQyxNQUFNLENBQUMsTUFBTSxZQUFZLHVCQUFVLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO1FBQ3BFLENBQUMsQ0FBQztRQUVGLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUU7WUFDL0IsS0FBSyxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSztZQUM3QixRQUFRO1NBR0YsQ0FBQyxDQUFDO0lBQ1osQ0FBQztDQUNGO0FBck5ELGdEQXFOQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIGFqdiBmcm9tICdhanYnO1xuaW1wb3J0ICogYXMgaHR0cCBmcm9tICdodHRwJztcbmltcG9ydCB7IE9ic2VydmFibGUgfSBmcm9tICdyeGpzL09ic2VydmFibGUnO1xuaW1wb3J0IHsgZnJvbVByb21pc2UgfSBmcm9tICdyeGpzL29ic2VydmFibGUvZnJvbVByb21pc2UnO1xuaW1wb3J0IHsgb2YgYXMgb2JzZXJ2YWJsZU9mIH0gZnJvbSAncnhqcy9vYnNlcnZhYmxlL29mJztcbmltcG9ydCB7IGNvbmNhdE1hcCwgc3dpdGNoTWFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgbWFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMvbWFwJztcbmltcG9ydCB7IFBhcnRpYWxseU9yZGVyZWRTZXQgfSBmcm9tICcuLi8uLi91dGlscyc7XG5pbXBvcnQgeyBKc29uT2JqZWN0LCBKc29uVmFsdWUgfSBmcm9tICcuLi9pbnRlcmZhY2UnO1xuaW1wb3J0IHtcbiAgU2NoZW1hRm9ybWF0LFxuICBTY2hlbWFGb3JtYXR0ZXIsXG4gIFNjaGVtYVJlZ2lzdHJ5LFxuICBTY2hlbWFWYWxpZGF0b3IsXG4gIFNjaGVtYVZhbGlkYXRvclJlc3VsdCxcbn0gZnJvbSAnLi9pbnRlcmZhY2UnO1xuaW1wb3J0IHsgYWRkVW5kZWZpbmVkRGVmYXVsdHMgfSBmcm9tICcuL3RyYW5zZm9ybXMnO1xuaW1wb3J0IHsgSnNvblZpc2l0b3IsIHZpc2l0SnNvbiB9IGZyb20gJy4vdmlzaXRvcic7XG5cblxuZXhwb3J0IGNsYXNzIENvcmVTY2hlbWFSZWdpc3RyeSBpbXBsZW1lbnRzIFNjaGVtYVJlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSBfYWp2OiBhanYuQWp2O1xuICBwcml2YXRlIF91cmlDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBKc29uT2JqZWN0PigpO1xuICBwcml2YXRlIF9wcmUgPSBuZXcgUGFydGlhbGx5T3JkZXJlZFNldDxKc29uVmlzaXRvcj4oKTtcbiAgcHJpdmF0ZSBfcG9zdCA9IG5ldyBQYXJ0aWFsbHlPcmRlcmVkU2V0PEpzb25WaXNpdG9yPigpO1xuXG4gIGNvbnN0cnVjdG9yKGZvcm1hdHM6IFNjaGVtYUZvcm1hdFtdID0gW10pIHtcbiAgICAvKipcbiAgICAgKiBCdWlsZCBhbiBBSlYgaW5zdGFuY2UgdGhhdCB3aWxsIGJlIHVzZWQgdG8gdmFsaWRhdGUgc2NoZW1hcy5cbiAgICAgKi9cblxuICAgIGNvbnN0IGZvcm1hdHNPYmo6IHsgW25hbWU6IHN0cmluZ106IFNjaGVtYUZvcm1hdHRlciB9ID0ge307XG5cbiAgICBmb3IgKGNvbnN0IGZvcm1hdCBvZiBmb3JtYXRzKSB7XG4gICAgICBmb3JtYXRzT2JqW2Zvcm1hdC5uYW1lXSA9IGZvcm1hdC5mb3JtYXR0ZXI7XG4gICAgfVxuXG4gICAgdGhpcy5fYWp2ID0gYWp2KHtcbiAgICAgIHJlbW92ZUFkZGl0aW9uYWw6ICdhbGwnLFxuICAgICAgdXNlRGVmYXVsdHM6IHRydWUsXG4gICAgICBmb3JtYXRzOiBmb3JtYXRzT2JqLFxuICAgICAgbG9hZFNjaGVtYTogKHVyaTogc3RyaW5nKSA9PiB0aGlzLl9mZXRjaCh1cmkpIGFzIGFqdi5UaGVuYWJsZTxvYmplY3Q+LFxuICAgIH0pO1xuXG4gICAgdGhpcy5fYWp2LmFkZE1ldGFTY2hlbWEocmVxdWlyZSgnYWp2L2xpYi9yZWZzL2pzb24tc2NoZW1hLWRyYWZ0LTA0Lmpzb24nKSk7XG5cbiAgICB0aGlzLmFkZFBvc3RUcmFuc2Zvcm0oYWRkVW5kZWZpbmVkRGVmYXVsdHMpO1xuICB9XG5cbiAgcHJpdmF0ZSBfZmV0Y2godXJpOiBzdHJpbmcpOiBQcm9taXNlPEpzb25PYmplY3Q+IHtcbiAgICBjb25zdCBtYXliZVNjaGVtYSA9IHRoaXMuX3VyaUNhY2hlLmdldCh1cmkpO1xuXG4gICAgaWYgKG1heWJlU2NoZW1hKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG1heWJlU2NoZW1hKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2U8SnNvbk9iamVjdD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgaHR0cC5nZXQodXJpLCByZXMgPT4ge1xuICAgICAgICBpZiAoIXJlcy5zdGF0dXNDb2RlIHx8IHJlcy5zdGF0dXNDb2RlID49IDMwMCkge1xuICAgICAgICAgIC8vIENvbnN1bWUgdGhlIHJlc3Qgb2YgdGhlIGRhdGEgdG8gZnJlZSBtZW1vcnkuXG4gICAgICAgICAgcmVzLnJlc3VtZSgpO1xuICAgICAgICAgIHJlamVjdChgUmVxdWVzdCBmYWlsZWQuIFN0YXR1cyBDb2RlOiAke3Jlcy5zdGF0dXNDb2RlfWApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlcy5zZXRFbmNvZGluZygndXRmOCcpO1xuICAgICAgICAgIGxldCBkYXRhID0gJyc7XG4gICAgICAgICAgcmVzLm9uKCdkYXRhJywgY2h1bmsgPT4ge1xuICAgICAgICAgICAgZGF0YSArPSBjaHVuaztcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXMub24oJ2VuZCcsICgpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKGRhdGEpO1xuICAgICAgICAgICAgICB0aGlzLl91cmlDYWNoZS5zZXQodXJpLCBqc29uKTtcbiAgICAgICAgICAgICAgcmVzb2x2ZShqc29uKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIGEgdHJhbnNmb3JtYXRpb24gc3RlcCBiZWZvcmUgdGhlIHZhbGlkYXRpb24gb2YgYW55IEpzb24uXG4gICAqIEBwYXJhbSB7SnNvblZpc2l0b3J9IHZpc2l0b3IgVGhlIHZpc2l0b3IgdG8gdHJhbnNmb3JtIGV2ZXJ5IHZhbHVlLlxuICAgKiBAcGFyYW0ge0pzb25WaXNpdG9yW119IGRlcHMgQSBsaXN0IG9mIG90aGVyIHZpc2l0b3JzIHRvIHJ1biBiZWZvcmUuXG4gICAqL1xuICBhZGRQcmVUcmFuc2Zvcm0odmlzaXRvcjogSnNvblZpc2l0b3IsIGRlcHM/OiBKc29uVmlzaXRvcltdKSB7XG4gICAgdGhpcy5fcHJlLmFkZCh2aXNpdG9yLCBkZXBzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgYSB0cmFuc2Zvcm1hdGlvbiBzdGVwIGFmdGVyIHRoZSB2YWxpZGF0aW9uIG9mIGFueSBKc29uLiBUaGUgSlNPTiB3aWxsIG5vdCBiZSB2YWxpZGF0ZWRcbiAgICogYWZ0ZXIgdGhlIFBPU1QsIHNvIGlmIHRyYW5zZm9ybWF0aW9ucyBhcmUgbm90IGNvbXBhdGlibGUgd2l0aCB0aGUgU2NoZW1hIGl0IHdpbGwgbm90IHJlc3VsdFxuICAgKiBpbiBhbiBlcnJvci5cbiAgICogQHBhcmFtIHtKc29uVmlzaXRvcn0gdmlzaXRvciBUaGUgdmlzaXRvciB0byB0cmFuc2Zvcm0gZXZlcnkgdmFsdWUuXG4gICAqIEBwYXJhbSB7SnNvblZpc2l0b3JbXX0gZGVwcyBBIGxpc3Qgb2Ygb3RoZXIgdmlzaXRvcnMgdG8gcnVuIGJlZm9yZS5cbiAgICovXG4gIGFkZFBvc3RUcmFuc2Zvcm0odmlzaXRvcjogSnNvblZpc2l0b3IsIGRlcHM/OiBKc29uVmlzaXRvcltdKSB7XG4gICAgdGhpcy5fcG9zdC5hZGQodmlzaXRvciwgZGVwcyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgX3Jlc29sdmVyKFxuICAgIHJlZjogc3RyaW5nLFxuICAgIHZhbGlkYXRlOiBhanYuVmFsaWRhdGVGdW5jdGlvbixcbiAgKTogeyBjb250ZXh0PzogYWp2LlZhbGlkYXRlRnVuY3Rpb24sIHNjaGVtYT86IEpzb25PYmplY3QgfSB7XG4gICAgaWYgKCF2YWxpZGF0ZSkge1xuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cblxuICAgIGNvbnN0IHJlZkhhc2ggPSByZWYuc3BsaXQoJyMnLCAyKVsxXTtcbiAgICBjb25zdCByZWZVcmwgPSByZWYuc3RhcnRzV2l0aCgnIycpID8gcmVmIDogcmVmLnNwbGl0KCcjJywgMSk7XG5cbiAgICBpZiAoIXJlZi5zdGFydHNXaXRoKCcjJykpIHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAgIHZhbGlkYXRlID0gKHZhbGlkYXRlLnJlZlZhbCBhcyBhbnkpWyh2YWxpZGF0ZS5yZWZzIGFzIGFueSlbcmVmVXJsWzBdXV07XG4gICAgfVxuICAgIGlmICh2YWxpZGF0ZSAmJiByZWZIYXNoKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgICB2YWxpZGF0ZSA9ICh2YWxpZGF0ZS5yZWZWYWwgYXMgYW55KVsodmFsaWRhdGUucmVmcyBhcyBhbnkpWycjJyArIHJlZkhhc2hdXTtcbiAgICB9XG5cbiAgICByZXR1cm4geyBjb250ZXh0OiB2YWxpZGF0ZSwgc2NoZW1hOiB2YWxpZGF0ZSAmJiB2YWxpZGF0ZS5zY2hlbWEgYXMgSnNvbk9iamVjdCB9O1xuICB9XG5cbiAgY29tcGlsZShzY2hlbWE6IEpzb25PYmplY3QpOiBPYnNlcnZhYmxlPFNjaGVtYVZhbGlkYXRvcj4ge1xuICAgIC8vIFN1cHBvcnRzIGJvdGggc3luY2hyb25vdXMgYW5kIGFzeW5jaHJvbm91cyBjb21waWxhdGlvbiwgYnkgdHJ5aW5nIHRoZSBzeW5jaHJvbm91c1xuICAgIC8vIHZlcnNpb24gZmlyc3QsIHRoZW4gaWYgcmVmcyBhcmUgbWlzc2luZyB0aGlzIHdpbGwgZmFpbHMuXG4gICAgLy8gV2UgYWxzbyBhZGQgYW55IHJlZnMgZnJvbSBleHRlcm5hbCBmZXRjaGVkIHNjaGVtYXMgc28gdGhhdCB0aG9zZSB3aWxsIGFsc28gYmUgdXNlZFxuICAgIC8vIGluIHN5bmNocm9ub3VzIChpZiBhdmFpbGFibGUpLlxuICAgIGxldCB2YWxpZGF0b3I6IE9ic2VydmFibGU8YWp2LlZhbGlkYXRlRnVuY3Rpb24+O1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBtYXliZUZuVmFsaWRhdGUgPSB0aGlzLl9hanYuY29tcGlsZShzY2hlbWEpO1xuICAgICAgdmFsaWRhdG9yID0gb2JzZXJ2YWJsZU9mKG1heWJlRm5WYWxpZGF0ZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gUHJvcGFnYXRlIHRoZSBlcnJvci5cbiAgICAgIGlmICghKGUgaW5zdGFuY2VvZiAoYWp2Lk1pc3NpbmdSZWZFcnJvciBhcyB7fSBhcyBGdW5jdGlvbikpKSB7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG5cbiAgICAgIHZhbGlkYXRvciA9IG5ldyBPYnNlcnZhYmxlKG9icyA9PiB7XG4gICAgICAgIHRoaXMuX2Fqdi5jb21waWxlQXN5bmMoc2NoZW1hKVxuICAgICAgICAgIC50aGVuKHZhbGlkYXRlID0+IHtcbiAgICAgICAgICAgIG9icy5uZXh0KHZhbGlkYXRlKTtcbiAgICAgICAgICAgIG9icy5jb21wbGV0ZSgpO1xuICAgICAgICAgIH0sIGVyciA9PiB7XG4gICAgICAgICAgICBvYnMuZXJyb3IoZXJyKTtcbiAgICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB2YWxpZGF0b3JcbiAgICAgIC5waXBlKFxuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgICAgIG1hcCh2YWxpZGF0ZSA9PiAoZGF0YTogYW55KTogT2JzZXJ2YWJsZTxTY2hlbWFWYWxpZGF0b3JSZXN1bHQ+ID0+IHtcbiAgICAgICAgICBsZXQgZGF0YU9icyA9IG9ic2VydmFibGVPZihkYXRhKTtcbiAgICAgICAgICB0aGlzLl9wcmUuZm9yRWFjaCh2aXNpdG9yID0+XG4gICAgICAgICAgICBkYXRhT2JzID0gZGF0YU9icy5waXBlKFxuICAgICAgICAgICAgICBjb25jYXRNYXAoZGF0YSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZpc2l0SnNvbihkYXRhIGFzIEpzb25WYWx1ZSwgdmlzaXRvciwgc2NoZW1hLCB0aGlzLl9yZXNvbHZlciwgdmFsaWRhdGUpO1xuICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICksXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIHJldHVybiBkYXRhT2JzLnBpcGUoXG4gICAgICAgICAgICBzd2l0Y2hNYXAodXBkYXRlZERhdGEgPT4ge1xuICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSB2YWxpZGF0ZSh1cGRhdGVkRGF0YSk7XG5cbiAgICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiByZXN1bHQgPT0gJ2Jvb2xlYW4nXG4gICAgICAgICAgICAgICAgPyBvYnNlcnZhYmxlT2YoW3VwZGF0ZWREYXRhLCByZXN1bHRdKVxuICAgICAgICAgICAgICAgIDogZnJvbVByb21pc2UoKHJlc3VsdCBhcyBQcm9taXNlTGlrZTxib29sZWFuPilcbiAgICAgICAgICAgICAgICAgIC50aGVuKHJlc3VsdCA9PiBbdXBkYXRlZERhdGEsIHJlc3VsdF0pKTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgc3dpdGNoTWFwKChbZGF0YSwgdmFsaWRdKSA9PiB7XG4gICAgICAgICAgICAgIGlmICh2YWxpZCkge1xuICAgICAgICAgICAgICAgIGxldCBkYXRhT2JzID0gb2JzZXJ2YWJsZU9mKGRhdGEpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3Bvc3QuZm9yRWFjaCh2aXNpdG9yID0+XG4gICAgICAgICAgICAgICAgICBkYXRhT2JzID0gZGF0YU9icy5waXBlKFxuICAgICAgICAgICAgICAgICAgICBjb25jYXRNYXAoZGF0YSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZpc2l0SnNvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEgYXMgSnNvblZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmlzaXRvcixcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjaGVtYSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3Jlc29sdmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0YU9icy5waXBlKFxuICAgICAgICAgICAgICAgICAgbWFwKGRhdGEgPT4gW2RhdGEsIHZhbGlkXSksXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb2JzZXJ2YWJsZU9mKFtkYXRhLCB2YWxpZF0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIG1hcCgoW2RhdGEsIHZhbGlkXSkgPT4ge1xuICAgICAgICAgICAgICBpZiAodmFsaWQpIHtcbiAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgICAgICAgICAgICAgY29uc3Qgc2NoZW1hRGF0YU1hcCA9IG5ldyBXZWFrTWFwPG9iamVjdCwgYW55PigpO1xuICAgICAgICAgICAgICAgIHNjaGVtYURhdGFNYXAuc2V0KHNjaGVtYSwgZGF0YSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4geyBkYXRhLCBzdWNjZXNzOiB0cnVlIH0gYXMgU2NoZW1hVmFsaWRhdG9yUmVzdWx0O1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBkYXRhLFxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGVycm9yczogKHZhbGlkYXRlLmVycm9ycyB8fCBbXSlcbiAgICAgICAgICAgICAgICAgIC5tYXAoKGVycjogYWp2LkVycm9yT2JqZWN0KSA9PiBgJHtlcnIuZGF0YVBhdGh9ICR7ZXJyLm1lc3NhZ2V9YCksXG4gICAgICAgICAgICAgIH0gYXMgU2NoZW1hVmFsaWRhdG9yUmVzdWx0O1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgKTtcbiAgICAgICAgfSksXG4gICAgICApO1xuICB9XG5cbiAgYWRkRm9ybWF0KGZvcm1hdDogU2NoZW1hRm9ybWF0KTogdm9pZCB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgIGNvbnN0IHZhbGlkYXRlID0gKGRhdGE6IGFueSkgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0ID0gZm9ybWF0LmZvcm1hdHRlci52YWxpZGF0ZShkYXRhKTtcblxuICAgICAgcmV0dXJuIHJlc3VsdCBpbnN0YW5jZW9mIE9ic2VydmFibGUgPyByZXN1bHQudG9Qcm9taXNlKCkgOiByZXN1bHQ7XG4gICAgfTtcblxuICAgIHRoaXMuX2Fqdi5hZGRGb3JtYXQoZm9ybWF0Lm5hbWUsIHtcbiAgICAgIGFzeW5jOiBmb3JtYXQuZm9ybWF0dGVyLmFzeW5jLFxuICAgICAgdmFsaWRhdGUsXG4gICAgLy8gQUpWIHR5cGluZ3MgbGlzdCBgY29tcGFyZWAgYXMgcmVxdWlyZWQsIGJ1dCBpdCBpcyBvcHRpb25hbC5cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgfSBhcyBhbnkpO1xuICB9XG59XG4iXX0=