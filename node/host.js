"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const fs = require("fs");
const Observable_1 = require("rxjs/Observable");
const empty_1 = require("rxjs/observable/empty");
const from_1 = require("rxjs/observable/from");
const concat_1 = require("rxjs/operators/concat");
const concatMap_1 = require("rxjs/operators/concatMap");
const ignoreElements_1 = require("rxjs/operators/ignoreElements");
const map_1 = require("rxjs/operators/map");
const mergeMap_1 = require("rxjs/operators/mergeMap");
const publish_1 = require("rxjs/operators/publish");
const refCount_1 = require("rxjs/operators/refCount");
const src_1 = require("../src");
const { FSWatcher } = require('chokidar');
function _callFs(fn, ...args) {
    return new Observable_1.Observable(obs => {
        fn(...args, (err, result) => {
            if (err) {
                obs.error(err);
            }
            else {
                obs.next(result);
                obs.complete();
            }
        });
    });
}
/**
 * An implementation of the Virtual FS using Node as the background. There are two versions; one
 * synchronous and one asynchronous.
 */
class NodeJsAsyncHost {
    get capabilities() {
        return { synchronous: false };
    }
    write(path, content) {
        return new Observable_1.Observable(obs => {
            // Create folders if necessary.
            const _createDir = (path) => {
                if (fs.existsSync(src_1.getSystemPath(path))) {
                    return;
                }
                if (src_1.dirname(path) === path) {
                    throw new Error();
                }
                _createDir(src_1.dirname(path));
                fs.mkdirSync(src_1.getSystemPath(path));
            };
            _createDir(src_1.dirname(path));
            _callFs(fs.writeFile, src_1.getSystemPath(path), new Uint8Array(content)).subscribe(obs);
        });
    }
    read(path) {
        return _callFs(fs.readFile, src_1.getSystemPath(path)).pipe(map_1.map(buffer => new Uint8Array(buffer).buffer));
    }
    delete(path) {
        return this.isDirectory(path).pipe(mergeMap_1.mergeMap(isDirectory => {
            if (isDirectory) {
                const allFiles = [];
                const allDirs = [];
                const _recurseList = (path) => {
                    for (const fragment of fs.readdirSync(src_1.getSystemPath(path))) {
                        if (fs.statSync(src_1.getSystemPath(src_1.join(path, fragment))).isDirectory()) {
                            _recurseList(src_1.join(path, fragment));
                            allDirs.push(src_1.join(path, fragment));
                        }
                        else {
                            allFiles.push(src_1.join(path, fragment));
                        }
                    }
                };
                _recurseList(path);
                return from_1.from(allFiles)
                    .pipe(mergeMap_1.mergeMap(p => _callFs(fs.unlink, src_1.getSystemPath(p))), ignoreElements_1.ignoreElements(), concat_1.concat(from_1.from(allDirs).pipe(concatMap_1.concatMap(p => _callFs(fs.rmdir, src_1.getSystemPath(p))))), map_1.map(() => { }));
            }
            else {
                return _callFs(fs.unlink, src_1.getSystemPath(path));
            }
        }));
    }
    rename(from, to) {
        return _callFs(fs.rename, src_1.getSystemPath(from), src_1.getSystemPath(to));
    }
    list(path) {
        return _callFs(fs.readdir, src_1.getSystemPath(path)).pipe(map_1.map(names => names.map(name => src_1.fragment(name))));
    }
    exists(path) {
        // Exists is a special case because it cannot error.
        return new Observable_1.Observable(obs => {
            fs.exists(path, exists => {
                obs.next(exists);
                obs.complete();
            });
        });
    }
    isDirectory(path) {
        return _callFs(fs.stat, src_1.getSystemPath(path)).pipe(map_1.map(stat => stat.isDirectory()));
    }
    isFile(path) {
        return _callFs(fs.stat, src_1.getSystemPath(path)).pipe(map_1.map(stat => stat.isDirectory()));
    }
    // Some hosts may not support stat.
    stat(path) {
        return _callFs(fs.stat, src_1.getSystemPath(path));
    }
    // Some hosts may not support watching.
    watch(path, _options) {
        return new Observable_1.Observable(obs => {
            const watcher = new FSWatcher({ persistent: true }).add(src_1.getSystemPath(path));
            watcher
                .on('change', path => {
                obs.next({
                    path: src_1.normalize(path),
                    time: new Date(),
                    type: 0 /* Changed */,
                });
            })
                .on('add', path => {
                obs.next({
                    path: src_1.normalize(path),
                    time: new Date(),
                    type: 1 /* Created */,
                });
            })
                .on('unlink', path => {
                obs.next({
                    path: src_1.normalize(path),
                    time: new Date(),
                    type: 2 /* Deleted */,
                });
            });
            return () => watcher.close();
        }).pipe(publish_1.publish(), refCount_1.refCount());
    }
}
exports.NodeJsAsyncHost = NodeJsAsyncHost;
/**
 * An implementation of the Virtual FS using Node as the backend, synchronously.
 */
class NodeJsSyncHost {
    get capabilities() {
        return { synchronous: true };
    }
    write(path, content) {
        return new Observable_1.Observable(obs => {
            // Create folders if necessary.
            const _createDir = (path) => {
                if (fs.existsSync(src_1.getSystemPath(path))) {
                    return;
                }
                _createDir(src_1.dirname(path));
                fs.mkdirSync(src_1.getSystemPath(path));
            };
            _createDir(src_1.dirname(path));
            fs.writeFileSync(src_1.getSystemPath(path), new Uint8Array(content));
            obs.next();
            obs.complete();
        });
    }
    read(path) {
        return new Observable_1.Observable(obs => {
            const buffer = fs.readFileSync(src_1.getSystemPath(path));
            obs.next(new Uint8Array(buffer).buffer);
            obs.complete();
        });
    }
    delete(path) {
        return this.isDirectory(path).pipe(concatMap_1.concatMap(isDir => {
            if (isDir) {
                // Since this is synchronous, we can recurse and safely ignore the result.
                for (const name of fs.readdirSync(src_1.getSystemPath(path))) {
                    this.delete(src_1.join(path, name)).subscribe();
                }
                fs.rmdirSync(src_1.getSystemPath(path));
            }
            else {
                fs.unlinkSync(src_1.getSystemPath(path));
            }
            return empty_1.empty();
        }));
    }
    rename(from, to) {
        return new Observable_1.Observable(obs => {
            fs.renameSync(src_1.getSystemPath(from), src_1.getSystemPath(to));
            obs.next();
            obs.complete();
        });
    }
    list(path) {
        return new Observable_1.Observable(obs => {
            const names = fs.readdirSync(src_1.getSystemPath(path));
            obs.next(names.map(name => src_1.fragment(name)));
            obs.complete();
        });
    }
    exists(path) {
        return new Observable_1.Observable(obs => {
            obs.next(fs.existsSync(src_1.getSystemPath(path)));
            obs.complete();
        });
    }
    isDirectory(path) {
        // tslint:disable-next-line:non-null-operator
        return this.stat(path).pipe(map_1.map(stat => stat.isDirectory()));
    }
    isFile(path) {
        // tslint:disable-next-line:non-null-operator
        return this.stat(path).pipe(map_1.map(stat => stat.isFile()));
    }
    // Some hosts may not support stat.
    stat(path) {
        return new Observable_1.Observable(obs => {
            obs.next(fs.statSync(src_1.getSystemPath(path)));
            obs.complete();
        });
    }
    // Some hosts may not support watching.
    watch(path, _options) {
        return new Observable_1.Observable(obs => {
            const opts = { persistent: false };
            const watcher = new FSWatcher(opts).add(src_1.getSystemPath(path));
            watcher
                .on('change', path => {
                obs.next({
                    path: src_1.normalize(path),
                    time: new Date(),
                    type: 0 /* Changed */,
                });
            })
                .on('add', path => {
                obs.next({
                    path: src_1.normalize(path),
                    time: new Date(),
                    type: 1 /* Created */,
                });
            })
                .on('unlink', path => {
                obs.next({
                    path: src_1.normalize(path),
                    time: new Date(),
                    type: 2 /* Deleted */,
                });
            });
            return () => watcher.close();
        }).pipe(publish_1.publish(), refCount_1.refCount());
    }
}
exports.NodeJsSyncHost = NodeJsSyncHost;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhcl9kZXZraXQvY29yZS9ub2RlL2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7O0dBTUc7QUFDSCx5QkFBeUI7QUFDekIsZ0RBQTZDO0FBQzdDLGlEQUE4QztBQUM5QywrQ0FBOEQ7QUFDOUQsa0RBQStDO0FBQy9DLHdEQUFxRDtBQUNyRCxrRUFBK0Q7QUFDL0QsNENBQXlDO0FBQ3pDLHNEQUFtRDtBQUNuRCxvREFBaUQ7QUFDakQsc0RBQW1EO0FBQ25ELGdDQVNnQjtBQWNoQixNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQW1DLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQWExRSxpQkFBMEIsRUFBWSxFQUFFLEdBQUcsSUFBVTtJQUNuRCxNQUFNLENBQUMsSUFBSSx1QkFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQzFCLEVBQUUsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEdBQVcsRUFBRSxNQUFnQixFQUFFLEVBQUU7WUFDNUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDUixHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2pCLENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDTixHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNqQixHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDakIsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBR0Q7OztHQUdHO0FBQ0g7SUFDRSxJQUFJLFlBQVk7UUFDZCxNQUFNLENBQUMsRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLENBQUM7SUFDaEMsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFVLEVBQUUsT0FBNkI7UUFDN0MsTUFBTSxDQUFDLElBQUksdUJBQVUsQ0FBTyxHQUFH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LElBQUksQ0FBQyxDQUFDLENBQUM7WUFFN0QsT0FBTztpQkFDSixFQUFFLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFO2dCQUNuQixHQUFHLENBQUMsSUFBSSxDQUFDO29CQUNQLElBQUksRUFBRSxlQUFTLENBQUMsSUFBSSxDQUFDO29CQUNyQixJQUFJLEVBQUUsSUFBSSxJQUFJLEVBQUU7b0JBQ2hCLElBQUksaUJBQXNDO2lCQUMzQyxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUM7aUJBQ0QsRUFBRSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsRUFBRTtnQkFDaEIsR0FBRyxDQUFDLElBQUksQ0FBQztvQkFDUCxJQUFJLEVBQUUsZUFBUyxDQUFDLElBQUksQ0FBQztvQkFDckIsSUFBSSxFQUFFLElBQUksSUFBSSxFQUFFO29CQUNoQixJQUFJLGlCQUFzQztpQkFDM0MsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDO2lCQUNELEVBQUUsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEVBQUU7Z0JBQ25CLEdBQUcsQ0FBQyxJQUFJLENBQUM7b0JBQ1AsSUFBSSxFQUFFLGVBQVMsQ0FBQyxJQUFJLENBQUM7b0JBQ3JCLElBQUksRUFBRSxJQUFJLElBQUksRUFBRTtvQkFDaEIsSUFBSSxpQkFBc0M7aUJBQzNDLENBQUMsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1lBRUwsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUMvQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQ0wsaUJBQU8sRUFBRSxFQUNULG1CQUFRLEVBQUUsQ0FDWCxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBaElELHdDQWdJQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7IE9ic2VydmFibGUgfSBmcm9tICdyeGpzL09ic2VydmFibGUnO1xuaW1wb3J0IHsgZW1wdHkgfSBmcm9tICdyeGpzL29ic2VydmFibGUvZW1wdHknO1xuaW1wb3J0IHsgZnJvbSBhcyBvYnNlcnZhYmxlRnJvbSB9IGZyb20gJ3J4anMvb2JzZXJ2YWJsZS9mcm9tJztcbmltcG9ydCB7IGNvbmNhdCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzL2NvbmNhdCc7XG5pbXBvcnQgeyBjb25jYXRNYXAgfSBmcm9tICdyeGpzL29wZXJhdG9ycy9jb25jYXRNYXAnO1xuaW1wb3J0IHsgaWdub3JlRWxlbWVudHMgfSBmcm9tICdyeGpzL29wZXJhdG9ycy9pZ25vcmVFbGVtZW50cyc7XG5pbXBvcnQgeyBtYXAgfSBmcm9tICdyeGpzL29wZXJhdG9ycy9tYXAnO1xuaW1wb3J0IHsgbWVyZ2VNYXAgfSBmcm9tICdyeGpzL29wZXJhdG9ycy9tZXJnZU1hcCc7XG5pbXBvcnQgeyBwdWJsaXNoIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMvcHVibGlzaCc7XG5pbXBvcnQgeyByZWZDb3VudCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzL3JlZkNvdW50JztcbmltcG9ydCB7XG4gIFBhdGgsXG4gIFBhdGhGcmFnbWVudCxcbiAgZGlybmFtZSxcbiAgZnJhZ21lbnQsXG4gIGdldFN5c3RlbVBhdGgsXG4gIGpvaW4sXG4gIG5vcm1hbGl6ZSxcbiAgdmlydHVhbEZzLFxufSBmcm9tICcuLi9zcmMnO1xuXG5cbmludGVyZmFjZSBDaG9raWRhcldhdGNoZXIge1xuICBuZXcgKG9wdGlvbnM6IHt9KTogQ2hva2lkYXJXYXRjaGVyO1xuXG4gIGFkZChwYXRoOiBzdHJpbmcpOiBDaG9raWRhcldhdGNoZXI7XG4gIG9uKHR5cGU6ICdjaGFuZ2UnLCBjYjogKHBhdGg6IHN0cmluZykgPT4gdm9pZCk6IENob2tpZGFyV2F0Y2hlcjtcbiAgb24odHlwZTogJ2FkZCcsIGNiOiAocGF0aDogc3RyaW5nKSA9PiB2b2lkKTogQ2hva2lkYXJXYXRjaGVyO1xuICBvbih0eXBlOiAndW5saW5rJywgY2I6IChwYXRoOiBzdHJpbmcpID0+IHZvaWQpOiBDaG9raWRhcldhdGNoZXI7XG5cbiAgY2xvc2UoKTogdm9pZDtcbn1cblxuY29uc3QgeyBGU1dhdGNoZXIgfTogeyBGU1dhdGNoZXI6IENob2tpZGFyV2F0Y2hlciB9ID0gcmVxdWlyZSgnY2hva2lkYXInKTtcblxuXG50eXBlIEZzRnVuY3Rpb24wPFI+ID0gKGNiOiAoZXJyPzogRXJyb3IsIHJlc3VsdD86IFIpID0+IHZvaWQpID0+IHZvaWQ7XG50eXBlIEZzRnVuY3Rpb24xPFIsIFQxPiA9IChwMTogVDEsIGNiOiAoZXJyPzogRXJyb3IsIHJlc3VsdD86IFIpID0+IHZvaWQpID0+IHZvaWQ7XG50eXBlIEZzRnVuY3Rpb24yPFIsIFQxLCBUMj5cbiAgPSAocDE6IFQxLCBwMjogVDIsIGNiOiAoZXJyPzogRXJyb3IsIHJlc3VsdD86IFIpID0+IHZvaWQpID0+IHZvaWQ7XG5cblxuZnVuY3Rpb24gX2NhbGxGczxSPihmbjogRnNGdW5jdGlvbjA8Uj4pOiBPYnNlcnZhYmxlPFI+O1xuZnVuY3Rpb24gX2NhbGxGczxSLCBUMT4oZm46IEZzRnVuY3Rpb24xPFIsIFQxPiwgcDE6IFQxKTogT2JzZXJ2YWJsZTxSPjtcbmZ1bmN0aW9uIF9jYWxsRnM8UiwgVDEsIFQyPihmbjogRnNGdW5jdGlvbjI8UiwgVDEsIFQyPiwgcDE6IFQxLCBwMjogVDIpOiBPYnNlcnZhYmxlPFI+O1xuXG5mdW5jdGlvbiBfY2FsbEZzPFJlc3VsdFQ+KGZuOiBGdW5jdGlvbiwgLi4uYXJnczoge31bXSk6IE9ic2VydmFibGU8UmVzdWx0VD4ge1xuICByZXR1cm4gbmV3IE9ic2VydmFibGUob2JzID0+IHtcbiAgICBmbiguLi5hcmdzLCAoZXJyPzogRXJyb3IsIHJlc3VsdD86IFJlc3VsdFQpID0+IHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgb2JzLmVycm9yKGVycik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvYnMubmV4dChyZXN1bHQpO1xuICAgICAgICBvYnMuY29tcGxldGUoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59XG5cblxuLyoqXG4gKiBBbiBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgVmlydHVhbCBGUyB1c2luZyBOb2RlIGFzIHRoZSBiYWNrZ3JvdW5kLiBUaGVyZSBhcmUgdHdvIHZlcnNpb25zOyBvbmVcbiAqIHN5bmNocm9ub3VzIGFuZCBvbmUgYXN5bmNocm9ub3VzLlxuICovXG5leHBvcnQgY2xhc3MgTm9kZUpzQXN5bmNIb3N0IGltcGxlbWVudHMgdmlydHVhbEZzLkhvc3Q8ZnMuU3RhdHM+IHtcbiAgZ2V0IGNhcGFiaWxpdGllcygpOiB2aXJ0dWFsRnMuSG9zdENhcGFiaWxpdGllcyB7XG4gICAgcmV0dXJuIHsgc3luY2hyb25vdXM6IGZhbHNlIH07XG4gIH1cblxuICB3cml0ZShwYXRoOiBQYXRoLCBjb250ZW50OiB2aXJ0dWFsRnMuRmlsZUJ1ZmZlcik6IE9ic2VydmFibGU8dm9pZD4ge1xuICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZTx2b2lkPihvYnMgPT4ge1xuICAgICAgLy8gQ3JlYXRlIGZvbGRlcnMgaWYgbmVjZXNzYXJ5LlxuICAgICAgY29uc3QgX2NyZWF0ZURpciA9IChwYXRoOiBQYXRoKSA9PiB7XG4gICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGdldFN5c3RlbVBhdGgocGF0aCkpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkaXJuYW1lKHBhdGgpID09PSBwYXRoKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gICAgICAgIH1cbiAgICAgICAgX2NyZWF0ZURpcihkaXJuYW1lKHBhdGgpKTtcbiAgICAgICAgZnMubWtkaXJTeW5jKGdldFN5c3RlbVBhdGgocGF0aCkpO1xuICAgICAgfTtcbiAgICAgIF9jcmVhdGVEaXIoZGlybmFtZShwYXRoKSk7XG5cbiAgICAgIF9jYWxsRnM8dm9pZCwgc3RyaW5nLCBVaW50OEFycmF5PihcbiAgICAgICAgZnMud3JpdGVGaWxlLFxuICAgICAgICBnZXRTeXN0ZW1QYXRoKHBhdGgpLFxuICAgICAgICBuZXcgVWludDhBcnJheShjb250ZW50KSxcbiAgICAgICkuc3Vic2NyaWJlKG9icyk7XG4gICAgfSk7XG4gIH1cblxuICByZWFkKHBhdGg6IFBhdGgpOiBPYnNlcnZhYmxlPHZpcnR1YWxGcy5GaWxlQnVmZmVyPiB7XG4gICAgcmV0dXJuIF9jYWxsRnMoZnMucmVhZEZpbGUsIGdldFN5c3RlbVBhdGgocGF0aCkpLnBpcGUoXG4gICAgICBtYXAoYnVmZmVyID0+IG5ldyBVaW50OEFycmF5KGJ1ZmZlcikuYnVmZmVyIGFzIHZpcnR1YWxGcy5GaWxlQnVmZmVyKSxcbiAgICApO1xuICB9XG5cbiAgZGVsZXRlKHBhdGg6IFBhdGgpOiBPYnNlcnZhYmxlPHZvaWQ+IHtcbiAgICByZXR1cm4gdGhpcy5pc0RpcmVjdG9yeShwYXRoKS5waXBlKFxuICAgICAgbWVyZ2VNYXAoaXNEaXJlY3RvcnkgPT4ge1xuICAgICAgICBpZiAoaXNEaXJlY3RvcnkpIHtcbiAgICAgICAgICBjb25zdCBhbGxGaWxlczogUGF0aFtdID0gW107XG4gICAgICAgICAgY29uc3QgYWxsRGlyczogUGF0aFtdID0gW107XG4gICAgICAgICAgY29uc3QgX3JlY3Vyc2VMaXN0ID0gKHBhdGg6IFBhdGgpID0+IHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZnJhZ21lbnQgb2YgZnMucmVhZGRpclN5bmMoZ2V0U3lzdGVtUGF0aChwYXRoKSkpIHtcbiAgICAgICAgICAgICAgaWYgKGZzLnN0YXRTeW5jKGdldFN5c3RlbVBhdGgoam9pbihwYXRoLCBmcmFnbWVudCkpKS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgICAgICAgX3JlY3Vyc2VMaXN0KGpvaW4ocGF0aCwgZnJhZ21lbnQpKTtcbiAgICAgICAgICAgICAgICBhbGxEaXJzLnB1c2goam9pbihwYXRoLCBmcmFnbWVudCkpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFsbEZpbGVzLnB1c2goam9pbihwYXRoLCBmcmFnbWVudCkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgICBfcmVjdXJzZUxpc3QocGF0aCk7XG5cbiAgICAgICAgICByZXR1cm4gb2JzZXJ2YWJsZUZyb20oYWxsRmlsZXMpXG4gICAgICAgICAgICAucGlwZShcbiAgICAgICAgICAgICAgbWVyZ2VNYXAocCA9PiBfY2FsbEZzKGZzLnVubGluaywgZ2V0U3lzdGVtUGF0aChwKSkpLFxuICAgICAgICAgICAgICBpZ25vcmVFbGVtZW50cygpLFxuICAgICAgICAgICAgICBjb25jYXQob2JzZXJ2YWJsZUZyb20oYWxsRGlycykucGlwZShcbiAgICAgICAgICAgICAgICBjb25jYXRNYXAocCA9PiBfY2FsbEZzKGZzLnJtZGlyLCBnZXRTeXN0ZW1QYXRoKHApKSksXG4gICAgICAgICAgICAgICkpLFxuICAgICAgICAgICAgICBtYXAoKCkgPT4ge30pLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gX2NhbGxGcyhmcy51bmxpbmssIGdldFN5c3RlbVBhdGgocGF0aCkpO1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICApO1xuICB9XG5cbiAgcmVuYW1lKGZyb206IFBhdGgsIHRvOiBQYXRoKTogT2JzZXJ2YWJsZTx2b2lkPiB7XG4gICAgcmV0dXJuIF9jYWxsRnMoZnMucmVuYW1lLCBnZXRTeXN0ZW1QYXRoKGZyb20pLCBnZXRTeXN0ZW1QYXRoKHRvKSk7XG4gIH1cblxuICBsaXN0KHBhdGg6IFBhdGgpOiBPYnNlcnZhYmxlPFBhdGhGcmFnbWVudFtdPiB7XG4gICAgcmV0dXJuIF9jYWxsRnMoZnMucmVhZGRpciwgZ2V0U3lzdGVtUGF0aChwYXRoKSkucGlwZShcbiAgICAgIG1hcChuYW1lcyA9PiBuYW1lcy5tYXAobmFtZSA9PiBmcmFnbWVudChuYW1lKSkpLFxuICAgICk7XG4gIH1cblxuICBleGlzdHMocGF0aDogUGF0aCk6IE9ic2VydmFibGU8Ym9vbGVhbj4ge1xuICAgIC8vIEV4aXN0cyBpcyBhIHNwZWNpYWwgY2FzZSBiZWNhdXNlIGl0IGNhbm5vdCBlcnJvci5cbiAgICByZXR1cm4gbmV3IE9ic2VydmFibGUob2JzID0+IHtcbiAgICAgIGZzLmV4aXN0cyhwYXRoLCBleGlzdHMgPT4ge1xuICAgICAgICBvYnMubmV4dChleGlzdHMpO1xuICAgICAgICBvYnMuY29tcGxldGUoKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgaXNEaXJlY3RvcnkocGF0aDogUGF0aCk6IE9ic2VydmFibGU8Ym9vbGVhbj4ge1xuICAgIHJldHVybiBfY2FsbEZzKGZzLnN0YXQsIGdldFN5c3RlbVBhdGgocGF0aCkpLnBpcGUoXG4gICAgICBtYXAoc3RhdCA9PiBzdGF0LmlzRGlyZWN0b3J5KCkpLFxuICAgICk7XG4gIH1cbiAgaXNGaWxlKHBhdGg6IFBhdGgpOiBPYnNlcnZhYmxlPGJvb2xlYW4+IHtcbiAgICByZXR1cm4gX2NhbGxGcyhmcy5zdGF0LCBnZXRTeXN0ZW1QYXRoKHBhdGgpKS5waXBlKFxuICAgICAgbWFwKHN0YXQgPT4gc3RhdC5pc0RpcmVjdG9yeSgpKSxcbiAgICApO1xuICB9XG5cbiAgLy8gU29tZSBob3N0cyBtYXkgbm90IHN1cHBvcnQgc3RhdC5cbiAgc3RhdChwYXRoOiBQYXRoKTogT2JzZXJ2YWJsZTx2aXJ0dWFsRnMuU3RhdHM8ZnMuU3RhdHM+PiB8IG51bGwge1xuICAgIHJldHVybiBfY2FsbEZzKGZzLnN0YXQsIGdldFN5c3RlbVBhdGgocGF0aCkpO1xuICB9XG5cbiAgLy8gU29tZSBob3N0cyBtYXkgbm90IHN1cHBvcnQgd2F0Y2hpbmcuXG4gIHdhdGNoKFxuICAgIHBhdGg6IFBhdGgsXG4gICAgX29wdGlvbnM/OiB2aXJ0dWFsRnMuSG9zdFdhdGNoT3B0aW9ucyxcbiAgKTogT2JzZXJ2YWJsZTx2aXJ0dWFsRnMuSG9zdFdhdGNoRXZlbnQ+IHwgbnVsbCB7XG4gICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPHZpcnR1YWxGcy5Ib3N0V2F0Y2hFdmVudD4ob2JzID0+IHtcbiAgICAgIGNvbnN0IHdhdGNoZXIgPSBuZXcgRlNXYXRjaGVyKHsgcGVyc2lzdGVudDogdHJ1ZSB9KS5hZGQoZ2V0U3lzdGVtUGF0aChwYXRoKSk7XG5cbiAgICAgIHdhdGNoZXJcbiAgICAgICAgLm9uKCdjaGFuZ2UnLCBwYXRoID0+IHtcbiAgICAgICAgICBvYnMubmV4dCh7XG4gICAgICAgICAgICBwYXRoOiBub3JtYWxpemUocGF0aCksXG4gICAgICAgICAgICB0aW1lOiBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgdHlwZTogdmlydHVhbEZzLkhvc3RXYXRjaEV2ZW50VHlwZS5DaGFuZ2VkLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgICAub24oJ2FkZCcsIHBhdGggPT4ge1xuICAgICAgICAgIG9icy5uZXh0KHtcbiAgICAgICAgICAgIHBhdGg6IG5vcm1hbGl6ZShwYXRoKSxcbiAgICAgICAgICAgIHRpbWU6IG5ldyBEYXRlKCksXG4gICAgICAgICAgICB0eXBlOiB2aXJ0dWFsRnMuSG9zdFdhdGNoRXZlbnRUeXBlLkNyZWF0ZWQsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5vbigndW5saW5rJywgcGF0aCA9PiB7XG4gICAgICAgICAgb2JzLm5leHQoe1xuICAgICAgICAgICAgcGF0aDogbm9ybWFsaXplKHBhdGgpLFxuICAgICAgICAgICAgdGltZTogbmV3IERhdGUoKSxcbiAgICAgICAgICAgIHR5cGU6IHZpcnR1YWxGcy5Ib3N0V2F0Y2hFdmVudFR5cGUuRGVsZXRlZCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgIHJldHVybiAoKSA9PiB3YXRjaGVyLmNsb3NlKCk7XG4gICAgfSkucGlwZShcbiAgICAgIHB1Ymxpc2goKSxcbiAgICAgIHJlZkNvdW50KCksXG4gICAgKTtcbiAgfVxufVxuXG5cbi8qKlxuICogQW4gaW1wbGVtZW50YXRpb24gb2YgdGhlIFZpcnR1YWwgRlMgdXNpbmcgTm9kZSBhcyB0aGUgYmFja2VuZCwgc3luY2hyb25vdXNseS5cbiAqL1xuZXhwb3J0IGNsYXNzIE5vZGVKc1N5bmNIb3N0IGltcGxlbWVudHMgdmlydHVhbEZzLkhvc3Q8ZnMuU3RhdHM+IHtcbiAgZ2V0IGNhcGFiaWxpdGllcygpOiB2aXJ0dWFsRnMuSG9zdENhcGFiaWxpdGllcyB7XG4gICAgcmV0dXJuIHsgc3luY2hyb25vdXM6IHRydWUgfTtcbiAgfVxuXG4gIHdyaXRlKHBhdGg6IFBhdGgsIGNvbnRlbnQ6IHZpcnR1YWxGcy5GaWxlQnVmZmVyKTogT2JzZXJ2YWJsZTx2b2lkPiB7XG4gICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlKG9icyA9PiB7XG4gICAgICAvLyBDcmVhdGUgZm9sZGVycyBpZiBuZWNlc3NhcnkuXG4gICAgICBjb25zdCBfY3JlYXRlRGlyID0gKHBhdGg6IFBhdGgpID0+IHtcbiAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoZ2V0U3lzdGVtUGF0aChwYXRoKSkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgX2NyZWF0ZURpcihkaXJuYW1lKHBhdGgpKTtcbiAgICAgICAgZnMubWtkaXJTeW5jKGdldFN5c3RlbVBhdGgocGF0aCkpO1xuICAgICAgfTtcbiAgICAgIF9jcmVhdGVEaXIoZGlybmFtZShwYXRoKSk7XG4gICAgICBmcy53cml0ZUZpbGVTeW5jKGdldFN5c3RlbVBhdGgocGF0aCksIG5ldyBVaW50OEFycmF5KGNvbnRlbnQpKTtcblxuICAgICAgb2JzLm5leHQoKTtcbiAgICAgIG9icy5jb21wbGV0ZSgpO1xuICAgIH0pO1xuICB9XG5cbiAgcmVhZChwYXRoOiBQYXRoKTogT2JzZXJ2YWJsZTx2aXJ0dWFsRnMuRmlsZUJ1ZmZlcj4ge1xuICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZShvYnMgPT4ge1xuICAgICAgY29uc3QgYnVmZmVyID0gZnMucmVhZEZpbGVTeW5jKGdldFN5c3RlbVBhdGgocGF0aCkpO1xuXG4gICAgICBvYnMubmV4dChuZXcgVWludDhBcnJheShidWZmZXIpLmJ1ZmZlciBhcyB2aXJ0dWFsRnMuRmlsZUJ1ZmZlcik7XG4gICAgICBvYnMuY29tcGxldGUoKTtcbiAgICB9KTtcbiAgfVxuXG4gIGRlbGV0ZShwYXRoOiBQYXRoKTogT2JzZXJ2YWJsZTx2b2lkPiB7XG4gICAgcmV0dXJuIHRoaXMuaXNEaXJlY3RvcnkocGF0aCkucGlwZShcbiAgICAgIGNvbmNhdE1hcChpc0RpciA9PiB7XG4gICAgICAgIGlmIChpc0Rpcikge1xuICAgICAgICAgIC8vIFNpbmNlIHRoaXMgaXMgc3luY2hyb25vdXMsIHdlIGNhbiByZWN1cnNlIGFuZCBzYWZlbHkgaWdub3JlIHRoZSByZXN1bHQuXG4gICAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIGZzLnJlYWRkaXJTeW5jKGdldFN5c3RlbVBhdGgocGF0aCkpKSB7XG4gICAgICAgICAgICB0aGlzLmRlbGV0ZShqb2luKHBhdGgsIG5hbWUpKS5zdWJzY3JpYmUoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZnMucm1kaXJTeW5jKGdldFN5c3RlbVBhdGgocGF0aCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGZzLnVubGlua1N5bmMoZ2V0U3lzdGVtUGF0aChwYXRoKSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZW1wdHkoKTtcbiAgICAgIH0pLFxuICAgICk7XG4gIH1cblxuICByZW5hbWUoZnJvbTogUGF0aCwgdG86IFBhdGgpOiBPYnNlcnZhYmxlPHZvaWQ+IHtcbiAgICByZXR1cm4gbmV3IE9ic2VydmFibGUob2JzID0+IHtcbiAgICAgIGZzLnJlbmFtZVN5bmMoZ2V0U3lzdGVtUGF0aChmcm9tKSwgZ2V0U3lzdGVtUGF0aCh0bykpO1xuICAgICAgb2JzLm5leHQoKTtcbiAgICAgIG9icy5jb21wbGV0ZSgpO1xuICAgIH0pO1xuICB9XG5cbiAgbGlzdChwYXRoOiBQYXRoKTogT2JzZXJ2YWJsZTxQYXRoRnJhZ21lbnRbXT4ge1xuICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZShvYnMgPT4ge1xuICAgICAgY29uc3QgbmFtZXMgPSBmcy5yZWFkZGlyU3luYyhnZXRTeXN0ZW1QYXRoKHBhdGgpKTtcbiAgICAgIG9icy5uZXh0KG5hbWVzLm1hcChuYW1lID0+IGZyYWdtZW50KG5hbWUpKSk7XG4gICAgICBvYnMuY29tcGxldGUoKTtcbiAgICB9KTtcbiAgfVxuXG4gIGV4aXN0cyhwYXRoOiBQYXRoKTogT2JzZXJ2YWJsZTxib29sZWFuPiB7XG4gICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlKG9icyA9PiB7XG4gICAgICBvYnMubmV4dChmcy5leGlzdHNTeW5jKGdldFN5c3RlbVBhdGgocGF0aCkpKTtcbiAgICAgIG9icy5jb21wbGV0ZSgpO1xuICAgIH0pO1xuICB9XG5cbiAgaXNEaXJlY3RvcnkocGF0aDogUGF0aCk6IE9ic2VydmFibGU8Ym9vbGVhbj4ge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpub24tbnVsbC1vcGVyYXRvclxuICAgIHJldHVybiB0aGlzLnN0YXQocGF0aCkgIS5waXBlKG1hcChzdGF0ID0+IHN0YXQuaXNEaXJlY3RvcnkoKSkpO1xuICB9XG4gIGlzRmlsZShwYXRoOiBQYXRoKTogT2JzZXJ2YWJsZTxib29sZWFuPiB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vbi1udWxsLW9wZXJhdG9yXG4gICAgcmV0dXJuIHRoaXMuc3RhdChwYXRoKSAhLnBpcGUobWFwKHN0YXQgPT4gc3RhdC5pc0ZpbGUoKSkpO1xuICB9XG5cbiAgLy8gU29tZSBob3N0cyBtYXkgbm90IHN1cHBvcnQgc3RhdC5cbiAgc3RhdChwYXRoOiBQYXRoKTogT2JzZXJ2YWJsZTx2aXJ0dWFsRnMuU3RhdHM8ZnMuU3RhdHM+PiB7XG4gICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlKG9icyA9PiB7XG4gICAgICBvYnMubmV4dChmcy5zdGF0U3luYyhnZXRTeXN0ZW1QYXRoKHBhdGgpKSk7XG4gICAgICBvYnMuY29tcGxldGUoKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIFNvbWUgaG9zdHMgbWF5IG5vdCBzdXBwb3J0IHdhdGNoaW5nLlxuICB3YXRjaChcbiAgICBwYXRoOiBQYXRoLFxuICAgIF9vcHRpb25zPzogdmlydHVhbEZzLkhvc3RXYXRjaE9wdGlvbnMsXG4gICk6IE9ic2VydmFibGU8dmlydHVhbEZzLkhvc3RXYXRjaEV2ZW50PiB8IG51bGwge1xuICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZTx2aXJ0dWFsRnMuSG9zdFdhdGNoRXZlbnQ+KG9icyA9PiB7XG4gICAgICBjb25zdCBvcHRzID0geyBwZXJzaXN0ZW50OiBmYWxzZSB9O1xuICAgICAgY29uc3Qgd2F0Y2hlciA9IG5ldyBGU1dhdGNoZXIob3B0cykuYWRkKGdldFN5c3RlbVBhdGgocGF0aCkpO1xuXG4gICAgICB3YXRjaGVyXG4gICAgICAgIC5vbignY2hhbmdlJywgcGF0aCA9PiB7XG4gICAgICAgICAgb2JzLm5leHQoe1xuICAgICAgICAgICAgcGF0aDogbm9ybWFsaXplKHBhdGgpLFxuICAgICAgICAgICAgdGltZTogbmV3IERhdGUoKSxcbiAgICAgICAgICAgIHR5cGU6IHZpcnR1YWxGcy5Ib3N0V2F0Y2hFdmVudFR5cGUuQ2hhbmdlZCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICAgLm9uKCdhZGQnLCBwYXRoID0+IHtcbiAgICAgICAgICBvYnMubmV4dCh7XG4gICAgICAgICAgICBwYXRoOiBub3JtYWxpemUocGF0aCksXG4gICAgICAgICAgICB0aW1lOiBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgdHlwZTogdmlydHVhbEZzLkhvc3RXYXRjaEV2ZW50VHlwZS5DcmVhdGVkLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgICAub24oJ3VubGluaycsIHBhdGggPT4ge1xuICAgICAgICAgIG9icy5uZXh0KHtcbiAgICAgICAgICAgIHBhdGg6IG5vcm1hbGl6ZShwYXRoKSxcbiAgICAgICAgICAgIHRpbWU6IG5ldyBEYXRlKCksXG4gICAgICAgICAgICB0eXBlOiB2aXJ0dWFsRnMuSG9zdFdhdGNoRXZlbnRUeXBlLkRlbGV0ZWQsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gKCkgPT4gd2F0Y2hlci5jbG9zZSgpO1xuICAgIH0pLnBpcGUoXG4gICAgICBwdWJsaXNoKCksXG4gICAgICByZWZDb3VudCgpLFxuICAgICk7XG4gIH1cbn1cbiJdfQ==