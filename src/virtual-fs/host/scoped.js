"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("../path");
class ScopedHost {
    constructor(_delegate, _root = path_1.NormalizedRoot) {
        this._delegate = _delegate;
        this._root = _root;
    }
    get capabilities() { return this._delegate.capabilities; }
    write(path, content) {
        return this._delegate.write(path_1.join(this._root, path), content);
    }
    read(path) {
        return this._delegate.read(path_1.join(this._root, path));
    }
    delete(path) {
        return this._delegate.delete(path_1.join(this._root, path));
    }
    rename(from, to) {
        return this._delegate.rename(path_1.join(this._root, from), path_1.join(this._root, to));
    }
    list(path) {
        return this._delegate.list(path_1.join(this._root, path));
    }
    exists(path) {
        return this._delegate.exists(path_1.join(this._root, path));
    }
    isDirectory(path) {
        return this._delegate.isDirectory(path_1.join(this._root, path));
    }
    isFile(path) {
        return this._delegate.isFile(path_1.join(this._root, path));
    }
    // Some hosts may not support stat.
    stat(path) {
        return this._delegate.stat(path_1.join(this._root, path));
    }
    // Some hosts may not support watching.
    watch(path, options) {
        return this._delegate.watch(path_1.join(this._root, path), options);
    }
}
exports.ScopedHost = ScopedHost;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NvcGVkLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyX2RldmtpdC9jb3JlL3NyYy92aXJ0dWFsLWZzL2hvc3Qvc2NvcGVkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBUUEsa0NBQW1FO0FBVW5FO0lBQ0UsWUFBc0IsU0FBa0IsRUFBWSxRQUFjLHFCQUFjO1FBQTFELGNBQVMsR0FBVCxTQUFTLENBQVM7UUFBWSxVQUFLLEdBQUwsS0FBSyxDQUF1QjtJQUFHLENBQUM7SUFFcEYsSUFBSSxZQUFZLEtBQXVCLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFFNUUsS0FBSyxDQUFDLElBQVUsRUFBRSxPQUFtQjtRQUNuQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsV0FBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDL0QsQ0FBQztJQUNELElBQUksQ0FBQyxJQUFVO1FBQ2IsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUNELE1BQU0sQ0FBQyxJQUFVO1FBQ2YsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFdBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUNELE1BQU0sQ0FBQyxJQUFVLEVBQUUsRUFBUTtRQUN6QixNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsV0FBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQUUsV0FBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM3RSxDQUFDO0lBRUQsSUFBSSxDQUFDLElBQVU7UUFDYixNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBRUQsTUFBTSxDQUFDLElBQVU7UUFDZixNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsV0FBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBQ0QsV0FBVyxDQUFDLElBQVU7UUFDcEIsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLFdBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDNUQsQ0FBQztJQUNELE1BQU0sQ0FBQyxJQUFVO1FBQ2YsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFdBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUVELG1DQUFtQztJQUNuQyxJQUFJLENBQUMsSUFBVTtRQUNiLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFFRCx1Q0FBdUM7SUFDdkMsS0FBSyxDQUFDLElBQVUsRUFBRSxPQUEwQjtRQUMxQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsV0FBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDL0QsQ0FBQztDQUNGO0FBekNELGdDQXlDQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7IE9ic2VydmFibGUgfSBmcm9tICdyeGpzL09ic2VydmFibGUnO1xuaW1wb3J0IHsgTm9ybWFsaXplZFJvb3QsIFBhdGgsIFBhdGhGcmFnbWVudCwgam9pbiB9IGZyb20gJy4uL3BhdGgnO1xuaW1wb3J0IHtcbiAgRmlsZUJ1ZmZlcixcbiAgSG9zdCxcbiAgSG9zdENhcGFiaWxpdGllcyxcbiAgSG9zdFdhdGNoRXZlbnQsXG4gIEhvc3RXYXRjaE9wdGlvbnMsXG4gIFN0YXRzLFxufSBmcm9tICcuL2ludGVyZmFjZSc7XG5cbmV4cG9ydCBjbGFzcyBTY29wZWRIb3N0PFQgZXh0ZW5kcyBvYmplY3Q+IGltcGxlbWVudHMgSG9zdDxUPiB7XG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBfZGVsZWdhdGU6IEhvc3Q8VD4sIHByb3RlY3RlZCBfcm9vdDogUGF0aCA9IE5vcm1hbGl6ZWRSb290KSB7fVxuXG4gIGdldCBjYXBhYmlsaXRpZXMoKTogSG9zdENhcGFiaWxpdGllcyB7IHJldHVybiB0aGlzLl9kZWxlZ2F0ZS5jYXBhYmlsaXRpZXM7IH1cblxuICB3cml0ZShwYXRoOiBQYXRoLCBjb250ZW50OiBGaWxlQnVmZmVyKTogT2JzZXJ2YWJsZTx2b2lkPiB7XG4gICAgcmV0dXJuIHRoaXMuX2RlbGVnYXRlLndyaXRlKGpvaW4odGhpcy5fcm9vdCwgcGF0aCksIGNvbnRlbnQpO1xuICB9XG4gIHJlYWQocGF0aDogUGF0aCk6IE9ic2VydmFibGU8RmlsZUJ1ZmZlcj4ge1xuICAgIHJldHVybiB0aGlzLl9kZWxlZ2F0ZS5yZWFkKGpvaW4odGhpcy5fcm9vdCwgcGF0aCkpO1xuICB9XG4gIGRlbGV0ZShwYXRoOiBQYXRoKTogT2JzZXJ2YWJsZTx2b2lkPiB7XG4gICAgcmV0dXJuIHRoaXMuX2RlbGVnYXRlLmRlbGV0ZShqb2luKHRoaXMuX3Jvb3QsIHBhdGgpKTtcbiAgfVxuICByZW5hbWUoZnJvbTogUGF0aCwgdG86IFBhdGgpOiBPYnNlcnZhYmxlPHZvaWQ+IHtcbiAgICByZXR1cm4gdGhpcy5fZGVsZWdhdGUucmVuYW1lKGpvaW4odGhpcy5fcm9vdCwgZnJvbSksIGpvaW4odGhpcy5fcm9vdCwgdG8pKTtcbiAgfVxuXG4gIGxpc3QocGF0aDogUGF0aCk6IE9ic2VydmFibGU8UGF0aEZyYWdtZW50W10+IHtcbiAgICByZXR1cm4gdGhpcy5fZGVsZWdhdGUubGlzdChqb2luKHRoaXMuX3Jvb3QsIHBhdGgpKTtcbiAgfVxuXG4gIGV4aXN0cyhwYXRoOiBQYXRoKTogT2JzZXJ2YWJsZTxib29sZWFuPiB7XG4gICAgcmV0dXJuIHRoaXMuX2RlbGVnYXRlLmV4aXN0cyhqb2luKHRoaXMuX3Jvb3QsIHBhdGgpKTtcbiAgfVxuICBpc0RpcmVjdG9yeShwYXRoOiBQYXRoKTogT2JzZXJ2YWJsZTxib29sZWFuPiB7XG4gICAgcmV0dXJuIHRoaXMuX2RlbGVnYXRlLmlzRGlyZWN0b3J5KGpvaW4odGhpcy5fcm9vdCwgcGF0aCkpO1xuICB9XG4gIGlzRmlsZShwYXRoOiBQYXRoKTogT2JzZXJ2YWJsZTxib29sZWFuPiB7XG4gICAgcmV0dXJuIHRoaXMuX2RlbGVnYXRlLmlzRmlsZShqb2luKHRoaXMuX3Jvb3QsIHBhdGgpKTtcbiAgfVxuXG4gIC8vIFNvbWUgaG9zdHMgbWF5IG5vdCBzdXBwb3J0IHN0YXQuXG4gIHN0YXQocGF0aDogUGF0aCk6IE9ic2VydmFibGU8U3RhdHM8VD4+IHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuX2RlbGVnYXRlLnN0YXQoam9pbih0aGlzLl9yb290LCBwYXRoKSk7XG4gIH1cblxuICAvLyBTb21lIGhvc3RzIG1heSBub3Qgc3VwcG9ydCB3YXRjaGluZy5cbiAgd2F0Y2gocGF0aDogUGF0aCwgb3B0aW9ucz86IEhvc3RXYXRjaE9wdGlvbnMpOiBPYnNlcnZhYmxlPEhvc3RXYXRjaEV2ZW50PiB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLl9kZWxlZ2F0ZS53YXRjaChqb2luKHRoaXMuX3Jvb3QsIHBhdGgpLCBvcHRpb25zKTtcbiAgfVxufVxuIl19