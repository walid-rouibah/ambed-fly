import {
    Extension,
} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import GLib from 'gi://GLib';

import {
    Fly,
} from './fly.js';

import {
    Ladybug,
} from './ladybug.js';


export default class AmbedFly extends Extension {

    enable() {
        this.settings =
            this.getSettings();

        this.creatures = [];

        this.lastTime =
            GLib.get_monotonic_time() / 1000000;

        this.settingsChangedId =
            this.settings.connect(
                'changed',
                () => this._rebuild()
            );

        this._rebuild();


        this.updateTimer =
            GLib.timeout_add(
                GLib.PRIORITY_DEFAULT,
                16,
                () => {
                    if (!this.creatures)
                        return GLib.SOURCE_REMOVE;

                    const now =
                        GLib.get_monotonic_time()
                        / 1000000;

                    let dt =
                        now -
                        this.lastTime;

                    this.lastTime = now;

                    dt = Math.max(
                        0.008,
                        Math.min(
                            0.035,
                            dt
                        )
                    );

                    this._updateCreatures(
                        now,
                        dt
                    );

                    return GLib.SOURCE_CONTINUE;
                }
            );
    }

    _rebuild() {
        this._destroyCreatures();

        const type =
            this.settings.get_string(
                'creature-type'
            );

        const count =
            Math.max(
                1,
                Math.min(
                    6,
                    this.settings.get_int(
                        'creature-count'
                    )
                )
            );

        if (type === 'both') {
            this._createBalanced(
                count
            );
        } else {
            for (let i = 0; i < count; i++) {
                this._createCreature(
                    type
                );
            }
        }
    }

    _createBalanced(count) {
        const firstType =
            Math.random() < 0.5
                ? 'fly'
                : 'ladybug';

        for (let i = 0; i < count; i++) {
            let type;

            if (count === 1) {
                type = firstType;
            } else if (i % 2 === 0) {
                type = firstType;
            } else {
                type =
                    firstType === 'fly'
                        ? 'ladybug'
                        : 'fly';
            }

            this._createCreature(
                type
            );
        }
    }

    _createCreature(type) {
        if (type === 'ladybug') {
            this.creatures.push(
                new Ladybug(this)
            );
        } else {
            this.creatures.push(
                new Fly(this)
            );
        }
    }

    _updateCreatures(now, dt) {
        if (!this.creatures)
            return;

        for (const creature of this.creatures) {
            creature.update(
                now,
                dt,
                this.creatures
            );
        }

        this._resolveCollisions();

        for (const creature of this.creatures) {
            creature.keepInsideMonitor();
            creature.applyPosition();
        }
    }

    _resolveCollisions() {
        const creatures =
            this.creatures;

        for (
            let i = 0;
            i < creatures.length;
            i++
        ) {
            const a =
                creatures[i];

            for (
                let j = i + 1;
                j < creatures.length;
                j++
            ) {
                const b =
                    creatures[j];

                if (
                    !a.container ||
                    !b.container
                ) {
                    continue;
                }

                const dx =
                    b.posX -
                    a.posX;

                const dy =
                    b.posY -
                    a.posY;

                const distance =
                    Math.hypot(
                        dx,
                        dy
                    );

                const minimum =
                    (
                        a.collisionRadius +
                        b.collisionRadius
                    );

                if (
                    distance >= minimum
                ) {
                    continue;
                }

                let nx;
                let ny;

                if (distance > 0.001) {
                    nx =
                        dx / distance;

                    ny =
                        dy / distance;
                } else {
                    const angle =
                        Math.random() *
                        Math.PI *
                        2;

                    nx =
                        Math.cos(angle);

                    ny =
                        Math.sin(angle);
                }

                const push =
                    (
                        minimum -
                        distance
                    ) * 0.55;

                a.posX -=
                    nx * push;

                a.posY -=
                    ny * push;

                b.posX +=
                    nx * push;

                b.posY +=
                    ny * push;
            }
        }
    }


    _destroyCreatures() {
        if (!this.creatures)
            return;

        for (const creature of this.creatures) {
            creature.destroy();
        }

        this.creatures = [];
    }


    disable() {
        if (this.updateTimer) {
            GLib.Source.remove(
                this.updateTimer
            );

            this.updateTimer = null;
        }

        if (
            this.settings &&
            this.settingsChangedId
        ) {
            this.settings.disconnect(
                this.settingsChangedId
            );

            this.settingsChangedId = null;
        }

        this._destroyCreatures();

        this.settings = null;
    }
}
