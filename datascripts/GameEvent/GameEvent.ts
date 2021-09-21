import { Cell } from "wotlkdata/cell/cells/Cell";
import { EnumCell } from "wotlkdata/cell/cells/EnumCell";
import { CellSystem } from "wotlkdata/cell/systems/CellSystem";
import { SQL } from "wotlkdata/sql/SQLFiles";
import { game_eventQuery, game_eventRow } from "wotlkdata/sql/types/game_event";
import { Table } from "wotlkdata/table/Table";
import { convertTime, DurationCell, TimeUnit } from "../Misc/DurationCell";
import { MainEntity } from "../Misc/Entity";
import { Ids, StaticIDGenerator } from "../Misc/Ids";
import { RegistryStaticNoClone } from "../Refs/Registry";
import { makeSQLDate, SQLDateCell } from "./Date";
import { DayOfTheWeek, resolveDayOfTheWeek } from "./DayOfTheWeek";
import { GameEventConditions } from "./GameEventCondition";
import { GameEventPrerequisitesBackward, GameEventPrerequisitesForward } from "./GameEventPrerequisites";

export class GameEventOccurrence extends CellSystem<GameEvent> {
    setYearly(startMonth: number, startDay: number, startHour: number = 0, startMinute = 0) {
        GameEvent.checkHoliday(this.owner);
        this.owner.row.occurence.set(BigInt(525600));
        this.owner.row.start_time.set(
            makeSQLDate(2004,startMonth,startDay,startHour,startMinute))
        return this.owner;
    }

    setWeekly(day: DayOfTheWeek, hour: number, minute: number) {
        GameEvent.checkHoliday(this.owner);
        this.owner.row.occurence.set(BigInt(10080))
        this.owner.row.start_time.set(
            makeSQLDate(2016,10,23+resolveDayOfTheWeek(day),hour,minute)
        );
        return this.owner;
    }

    set(startHour: number, startMinute: number, waitTime: number, unit: TimeUnit = 'minutes') {
        GameEvent.checkHoliday(this.owner);
        this.owner.row.occurence.set(BigInt(convertTime(waitTime,unit,'minutes')));
        this.owner.row.start_time.set(
            makeSQLDate(2016,10,28,startHour,startMinute)
        );
        return this.owner;
    }

    setHourly(hour: number, minute: number) {
        GameEvent.checkHoliday(this.owner);
        return this.set(hour,minute,60);
    }

    setDaily(hour: number, minute: number) {
        GameEvent.checkHoliday(this.owner);
        return this.set(hour,minute,1440);
    }

    get StartDate() {
        return new SQLDateCell(this.owner, this.owner.row.start_time);
    }

    get EndDate() {
        return new SQLDateCell(this.owner, this.owner.row.end_time);
    }

    get Period() {
        return new DurationCell(
              this.owner
            , 'minutes'
            , true
            , new GameEventBigIntCell(this.owner, this.owner.row.occurence)
        );
    }
}

/**
 * Occurrence and length
 */
class GameEventBigIntCell extends Cell<number,GameEvent> {
    protected cell: Cell<bigint,any>

    constructor(owner: GameEvent, cell: Cell<bigint,any>) {
        super(owner);
        this.cell = cell;
    }

    get(): number {
        return Number(this.cell.get());
    }

    set(value: number) {
        GameEvent.checkHoliday(this.owner);
        this.cell.set(BigInt(value));
        return this.owner;
    }
}

export class GameEventState extends EnumCell<GameEvent> {
    set(value: number) {
        GameEvent.checkHoliday(this.owner);
        return super.set(value);
    }

    /** Enum Value = 0 */
    get Normal() { return this.value(0); }

    /** Enum Value = 1 */
    get WorldEvent() {
        return this.value(1,()=>{
            this.owner.row.start_time.set(null as any);
            this.owner.row.end_time.set(null as any);
            this.owner.row.occurence.set(BigInt(0));
            this.owner.row.length.set(BigInt(0));
        });
    }

    /** Enum Value = 5 */
    get Internal() { return this.value(5); }
}

export class GameEvent extends MainEntity<game_eventRow> {
    get ID() { return this.row.eventEntry.get(); }
    get Type() { return new GameEventState(this, this.row.world_event)}

    get Occurrence() { return new GameEventOccurrence(this); }

    get Duration() {
        return new DurationCell(
              this
            , 'minutes'
            , true
            , new GameEventBigIntCell(this, this.row.length)
        );
    }

    get Prerequisites() {
        return new GameEventPrerequisitesForward(this);
    }

    get PrerequisiteFor() {
        return new GameEventPrerequisitesBackward(this);
    }

    get Conditions() { return new GameEventConditions(this, this.ID); }

    static checkHoliday(event: GameEvent) {
        if(event.row.holiday.get() !== 0) {
            throw new Error(
                  `Do not set event times or durations for holiday `
                + `game events. Instead, change them in the holiday itself.`
            )
        }
    }

    static updateHolidayOccurrence(event: GameEvent, type: number) {
        // note: tswow only supports weekly and yearly holidays for now
        switch(type) {
            case 0:
                event.row.occurence.set(BigInt(10080))
                break;
            case 1:
            case -1:
                event.row.occurence.set(BigInt(525600))
                break;
            // Don't actually change it here, the change should come
            // (and if it doesn't we probably don't want to change anything)
            case 2:
                break;
        }
    }
}

export class GameEventRegistryClass
    extends RegistryStaticNoClone<GameEvent,game_eventRow,game_eventQuery>
{
    protected Table(): Table<any, game_eventQuery, game_eventRow> & { add: (id: number) => game_eventRow; } {
        return SQL.game_event
    }
    protected IDs(): StaticIDGenerator {
        return Ids.game_event
    }
    Clear(r: GameEvent, mod: string, name: string): void {
        r.Duration.set(1,'minutes')
         .Occurrence.setDaily(24,0)
         .Type.Normal.set()
    }
    protected FindByID(id: number): game_eventRow {
        return SQL.game_event.find({eventEntry:id})
    }
    protected EmptyQuery(): game_eventQuery {
        return {}
    }
    ID(e: GameEvent): number {
        return e.ID
    }
    protected Entity(r: game_eventRow): GameEvent {
        return new GameEvent(r);
    }
}

export const GameEventRegistry = new GameEventRegistryClass();