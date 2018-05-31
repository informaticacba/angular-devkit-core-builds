/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable } from 'rxjs';
import { Path } from '..';
import { FileBuffer, HostWatchEvent, HostWatchOptions, Stats } from './interface';
import { SimpleMemoryHost, SimpleMemoryHostStats } from './memory';
import { SyncDelegateHost } from './sync';
export declare type TestLogRecord = {
    kind: 'write' | 'read' | 'delete' | 'list' | 'exists' | 'isDirectory' | 'isFile' | 'stat' | 'watch';
    path: Path;
} | {
    kind: 'rename';
    from: Path;
    to: Path;
};
export declare class TestHost extends SimpleMemoryHost {
    protected _records: TestLogRecord[];
    protected _sync: SyncDelegateHost<{}>;
    constructor(map?: {
        [path: string]: string;
    });
    readonly records: TestLogRecord[];
    clearRecords(): void;
    readonly files: Path[];
    readonly sync: SyncDelegateHost<{}>;
    clone(): TestHost;
    protected _write(path: Path, content: FileBuffer): void;
    protected _read(path: Path): ArrayBuffer;
    protected _delete(path: Path): void;
    protected _rename(from: Path, to: Path): void;
    protected _list(path: Path): (string & {
        __PRIVATE_DEVKIT_PATH: void;
    } & {
        __PRIVATE_DEVKIT_PATH_FRAGMENT: void;
    })[];
    protected _exists(path: Path): boolean;
    protected _isDirectory(path: Path): boolean;
    protected _isFile(path: Path): boolean;
    protected _stat(path: Path): Stats<SimpleMemoryHostStats> | null;
    protected _watch(path: Path, options?: HostWatchOptions): Observable<HostWatchEvent>;
    $write(path: string, content: string): void;
    $read(path: string): string;
    $list(path: string): (string & {
        __PRIVATE_DEVKIT_PATH: void;
    } & {
        __PRIVATE_DEVKIT_PATH_FRAGMENT: void;
    })[];
    $exists(path: string): boolean;
    $isDirectory(path: string): boolean;
    $isFile(path: string): boolean;
}
