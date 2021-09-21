import { DBC } from "wotlkdata";
import { WorldMapAreaQuery, WorldMapAreaRow } from "wotlkdata/dbc/types/WorldMapArea";
import { Table } from "wotlkdata/table/Table";
import { AreaRegistry } from "../Area/Area";
import { MapRegistry } from "../Map/Maps";
import { MainEntity } from "../Misc/Entity";
import { DynamicIDGenerator, Ids } from "../Misc/Ids";
import { Boundary } from "../Misc/LimitCells";
import { RegistryDynamic } from "../Refs/Registry";
import { DungeonMapRegistry } from "./DungeonMap";

export class WorldMapArea extends MainEntity<WorldMapAreaRow> {
    get ID() { return this.row.ID.get(); }
    get Map() { return MapRegistry.ref(this, this.row.MapID); }
    get Area() { return AreaRegistry.ref(this, this.row.AreaID); }
    get Name() { return this.wrap(this.row.AreaName); }
    get Boundary() {
        return new Boundary(
              this
            , this.row.LocLeft
            , this.row.LocTop
            , this.row.LocRight
            , this.row.LocBottom
        );
    }
    get DisplayMap() { return MapRegistry.ref(this, this.row.DisplayMapID); }
    get DefaultDungeonFloor() {
        return DungeonMapRegistry.ref(this, this.row.DefaultDungeonFloor);
    }
    get ParentWorldMap() { return this.wrap(this.row.ParentWorldMapID) }
}

export class WorldMapAreaRegistryClass
    extends RegistryDynamic<WorldMapArea,WorldMapAreaRow,WorldMapAreaQuery>
{
    protected Table(): Table<any, WorldMapAreaQuery, WorldMapAreaRow> & { add: (id: number) => WorldMapAreaRow; } {
        return DBC.WorldMapArea
    }
    protected ids(): DynamicIDGenerator {
        return Ids.WorldMapArea
    }
    Clear(entity: WorldMapArea): void {
        entity
            .Area.set(0)
            .Boundary.set(0,0,0,0)
            .DefaultDungeonFloor.set(0)
            .DisplayMap.set(0)
            .Map.set(0)
            .Name.set('')
            .ParentWorldMap.set(0)
    }
    protected FindByID(id: number): WorldMapAreaRow {
        return DBC.WorldMapArea.findById(id);
    }
    protected EmptyQuery(): WorldMapAreaQuery {
        return {}
    }
    ID(e: WorldMapArea): number {
        return e.ID
    }
    protected Entity(r: WorldMapAreaRow): WorldMapArea {
        return new WorldMapArea(r);
    }
}

export const WorldMapAreaRegistry = new WorldMapAreaRegistryClass();