import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import St from 'gi://St';
import Gio from 'gi://Gio';


export class Fly {

    constructor(extension) {
        this.dir =
            extension.dir;

        const assets =
            this.dir.get_child(
                'assets'
            );

        const flyFrames =
            assets.get_child(
                'fly_frame'
            );

        this.frames = [
            flyFrames
                .get_child(
                    'fly_frame1.png'
                )
                .get_path(),

            flyFrames
                .get_child(
                    'fly_frame2.png'
                )
                .get_path(),

            flyFrames
                .get_child(
                    'fly_frame3.png'
                )
                .get_path(),
        ];

        // ------------------------------------------------------------
        // Original size from the old version.
        // ------------------------------------------------------------

        this.SIZE = 45;
        this.FLY_SIZE = 35;

        this.currentFrame = 0;
        this.animationTime = 0;

        // ------------------------------------------------------------
        // Actor
        // ------------------------------------------------------------

        this.container =
            new St.Bin({
                reactive: false,
            });

        this.container.set_size(
            this.SIZE,
            this.SIZE
        );

        this.container.set_pivot_point(
            0.5,
            0.5
        );

        this.icon =
            new St.Icon({
                gicon:
                    Gio.FileIcon.new(
                        Gio.File.new_for_path(
                            this.frames[0]
                        )
                    ),

                icon_size:
                    this.FLY_SIZE,

                reactive: false,
            });

        this.icon.set_pivot_point(
            0.5,
            0.5
        );

        this.container.set_child(
            this.icon
        );

        Main.layoutManager.addChrome(
            this.container
        );

        // ------------------------------------------------------------
        // Monitor
        // ------------------------------------------------------------

        this.monitor =
            Main.layoutManager.primaryMonitor;

        // ------------------------------------------------------------
        // Position
        // ------------------------------------------------------------

        this.posX =
            this.monitor.x +
            100 +
            Math.random() *
            Math.max(
                1,
                this.monitor.width -
                200
            );

        this.posY =
            this.monitor.y +
            100 +
            Math.random() *
            Math.max(
                1,
                this.monitor.height -
                200
            );

        // ------------------------------------------------------------
        // Movement
        // ------------------------------------------------------------

        this.angle =
            Math.random() * 360;

        this.speed = 1.5;
        this.targetSpeed = 2;

        this.angularVelocity = 0;
        this.wanderForce = 0;

        // ------------------------------------------------------------
        // Behavior
        // ------------------------------------------------------------

        this.mode = 'wander';

        this.modeUntil =
            this._now() +
            2000 +
            Math.random() * 3000;

        // ------------------------------------------------------------
        // Pointer
        // ------------------------------------------------------------

        this.pointerX = 0;
        this.pointerY = 0;

        this.lastPointerX = 0;
        this.lastPointerY = 0;

        this.pointerVelocityX = 0;
        this.pointerVelocityY = 0;

        // ------------------------------------------------------------
        // Window
        // ------------------------------------------------------------

        this.lastWindowRect = null;

        this.windowTargetX = 0;
        this.windowTargetY = 0;

        this.collisionRadius = 16;

        this.container.set_position(
            this.posX,
            this.posY
        );
    }

    // ================================================================
    // UPDATE
    // ================================================================

    update(now, dt) {
        if (!this.container)
            return;

        this._updatePointer();

        this._updateBehavior(
            now
        );

        this._updateAnimation(
            dt
        );

        this._move(
            dt
        );
    }

    // ================================================================
    // TIME
    // ================================================================

    _now() {
        return Date.now() / 1000;
    }

    // ================================================================
    // POINTER
    // ================================================================

    _updatePointer() {
        const [
            x,
            y,
        ] = global.get_pointer();

        this.pointerVelocityX =
            (
                x -
                this.lastPointerX
            ) * 0.35 +
            this.pointerVelocityX *
            0.65;

        this.pointerVelocityY =
            (
                y -
                this.lastPointerY
            ) * 0.35 +
            this.pointerVelocityY *
            0.65;

        this.pointerX = x;
        this.pointerY = y;

        this.lastPointerX = x;
        this.lastPointerY = y;
    }

    // ================================================================
    // BEHAVIOR
    // ================================================================

    _updateBehavior(now) {

        // ------------------------------------------------------------
        // Detect moving focused window.
        // This is preserved from the old behavior.
        // ------------------------------------------------------------

        const window =
            global.display.focus_window;

        if (
            window &&
            !window.minimized &&
            typeof window.get_frame_rect ===
            'function'
        ) {
            const rect =
                window.get_frame_rect();

            if (this.lastWindowRect) {
                const moved =
                    Math.abs(
                        rect.x -
                        this.lastWindowRect.x
                    ) > 1 ||
                    Math.abs(
                        rect.y -
                        this.lastWindowRect.y
                    ) > 1;

                if (moved) {
                    this.mode =
                        'window';

                    this.modeUntil =
                        now + 0.65;

                    this.windowTargetX =
                        rect.x +
                        rect.width *
                        (
                            0.2 +
                            Math.random() *
                            0.6
                        );

                    this.windowTargetY =
                        rect.y - 15;
                }
            }

            this.lastWindowRect = {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
            };
        } else {
            this.lastWindowRect =
                null;
        }

        // ------------------------------------------------------------
        // End temporary behavior.
        // ------------------------------------------------------------

        if (now > this.modeUntil) {
            if (this.mode !== 'wander') {
                this.mode =
                    'wander';

                this.modeUntil =
                    now +
                    1800 +
                    Math.random() *
                    3000;
            } else if (
                Math.random() < 0.0035
            ) {
                this.mode =
                    'cursor';

                this.modeUntil =
                    now +
                    1800 +
                    Math.random() *
                    2600;
            }
        }
    }

    // ================================================================
    // MOVEMENT
    // ================================================================

    _move(dt) {
        if (!this.container)
            return;

        this.monitor =
            Main.layoutManager.primaryMonitor;

        let steer = 0;
        let speedBoost = 0;

        // ------------------------------------------------------------
        // Cursor behavior from the old version.
        // ------------------------------------------------------------

        if (this.mode === 'cursor') {

            const targetX =
                this.pointerX +
                this.pointerVelocityX *
                7;

            const targetY =
                this.pointerY +
                this.pointerVelocityY *
                7;

            const dx =
                targetX -
                this.posX;

            const dy =
                targetY -
                this.posY;

            const distance =
                Math.hypot(
                    dx,
                    dy
                );

            let targetAngle =
                Math.atan2(
                    dy,
                    dx
                ) *
                180 /
                Math.PI;

            if (distance < 90) {
                targetAngle +=
                    Math.sin(
                        this.angle *
                        Math.PI /
                        180
                    ) * 35;
            }

            steer =
                this._angleDiff(
                    targetAngle,
                    this.angle
                ) * 0.055;

            speedBoost =
                Math.min(
                    1.4,
                    distance / 140
                );
        }

        // ------------------------------------------------------------
        // Window behavior.
        // ------------------------------------------------------------

        else if (
            this.mode === 'window'
        ) {

            const targetAngle =
                Math.atan2(
                    this.windowTargetY -
                    this.posY,

                    this.windowTargetX -
                    this.posX
                ) *
                180 /
                Math.PI;

            steer =
                this._angleDiff(
                    targetAngle,
                    this.angle
                ) * 0.06;

            speedBoost =
                1.2;
        }

        // ------------------------------------------------------------
        // Natural wandering.
        // ------------------------------------------------------------

        else {

            this.wanderForce +=
                (
                    Math.random() -
                    0.5
                ) * 0.55;

            this.wanderForce *=
                0.96;

            this.wanderForce =
                Math.max(
                    -2.2,
                    Math.min(
                        2.2,
                        this.wanderForce
                    )
                );

            steer =
                this.wanderForce;
        }

        // ------------------------------------------------------------
        // Strong pointer safety.
        //
        // The fly can interact with the pointer,
        // but it must not sit directly underneath it.
        // ------------------------------------------------------------

        const pointerDX =
            this.posX -
            this.pointerX;

        const pointerDY =
            this.posY -
            this.pointerY;

        const pointerDistance =
            Math.hypot(
                pointerDX,
                pointerDY
            );

        if (
            pointerDistance < 48 &&
            pointerDistance > 0.001
        ) {
            const awayAngle =
                Math.atan2(
                    pointerDY,
                    pointerDX
                ) *
                180 /
                Math.PI;

            const repulsion =
                (
                    48 -
                    pointerDistance
                ) / 48;

            steer +=
                this._angleDiff(
                    awayAngle,
                    this.angle
                ) *
                0.12 *
                repulsion;
        }

        // ------------------------------------------------------------
        // Edge avoidance.
        //
        // Start turning before touching the edge.
        // ------------------------------------------------------------

        const edgeSteer =
            this._edgeAvoidance();

        steer +=
            edgeSteer * 0.13;

        // ------------------------------------------------------------
        // Organic turning.
        // ------------------------------------------------------------

        this.angularVelocity +=
            (
                Math.random() -
                0.5
            ) * 0.55 +
            steer;

        this.angularVelocity *=
            0.91;

        this.angularVelocity =
            Math.max(
                -6,
                Math.min(
                    6,
                    this.angularVelocity
                )
            );

        this.angle +=
            this.angularVelocity;

        // ------------------------------------------------------------
        // Random speed changes.
        // ------------------------------------------------------------

        if (
            Math.random() < 0.008
        ) {
            this.targetSpeed =
                0.7 +
                Math.random() *
                3.2;
        }

        this.speed +=
            (
                this.targetSpeed -
                this.speed
            ) * 0.035;

        // ------------------------------------------------------------
        // Slow down slightly during sharp turns.
        // ------------------------------------------------------------

        const turnFactor =
            1 -
            Math.min(
                0.3,
                Math.abs(
                    this.angularVelocity
                ) / 22
            );

        const currentSpeed =
            (
                this.speed +
                speedBoost
            ) * turnFactor;

        const radians =
            this.angle *
            Math.PI /
            180;

        this.posX +=
            Math.cos(
                radians
            ) *
            currentSpeed;

        this.posY +=
            Math.sin(
                radians
            ) *
            currentSpeed;

        this.keepInsideMonitor();
    }

    // ================================================================
    // EDGE AVOIDANCE
    // ================================================================

    _edgeAvoidance() {
        const monitor =
            this.monitor;

        const margin = 110;

        let forceX = 0;
        let forceY = 0;

        const left =
            this.posX -
            monitor.x;

        const right =
            monitor.x +
            monitor.width -
            this.posX;

        const top =
            this.posY -
            monitor.y;

        const bottom =
            monitor.y +
            monitor.height -
            this.posY;

        if (left < margin) {
            forceX +=
                (margin - left) /
                margin;
        }

        if (right < margin) {
            forceX -=
                (margin - right) /
                margin;
        }

        if (top < margin) {
            forceY +=
                (margin - top) /
                margin;
        }

        if (bottom < margin) {
            forceY -=
                (margin - bottom) /
                margin;
        }

        if (
            Math.abs(forceX) +
            Math.abs(forceY) <
            0.001
        ) {
            return 0;
        }

        const desiredAngle =
            Math.atan2(
                forceY,
                forceX
            ) *
            180 /
            Math.PI;

        return this._angleDiff(
            desiredAngle,
            this.angle
        );
    }

    // ================================================================
    // ANIMATION
    // ================================================================

    _updateAnimation(dt) {
        this.animationTime += dt;

        // Very fast frame switching.
        if (
            this.animationTime <
            0.025
        ) {
            return;
        }

        this.animationTime = 0;

        this.currentFrame =
            (
                this.currentFrame + 1
            ) %
            this.frames.length;

        this.icon.set_gicon(
            Gio.FileIcon.new(
                Gio.File.new_for_path(
                    this.frames[
                        this.currentFrame
                    ]
                )
            )
        );
    }

    // ================================================================
    // ANGLES
    // ================================================================

    _angleDiff(
        target,
        current
    ) {
        let diff =
            (
                target -
                current
            ) % 360;

        if (diff > 180)
            diff -= 360;

        if (diff < -180)
            diff += 360;

        return diff;
    }

    // ================================================================
    // SCREEN BOUNDS
    // ================================================================

    keepInsideMonitor() {
        const monitor =
            this.monitor;

        const margin = 8;

        const minX =
            monitor.x +
            margin;

        const minY =
            monitor.y +
            margin;

        const maxX =
            monitor.x +
            monitor.width -
            this.SIZE -
            margin;

        const maxY =
            monitor.y +
            monitor.height -
            this.SIZE -
            margin;

        if (this.posX < minX)
            this.posX = minX;

        if (this.posX > maxX)
            this.posX = maxX;

        if (this.posY < minY)
            this.posY = minY;

        if (this.posY > maxY)
            this.posY = maxY;
    }

    // ================================================================
    // APPLY
    // ================================================================

    applyPosition() {
        if (!this.container)
            return;

        this.container.set_position(
            this.posX,
            this.posY
        );

        this.icon.rotation_angle_z =
            this.angle + 90;
    }

    // ================================================================
    // DESTROY
    // ================================================================

    destroy() {
        if (this.icon) {
            this.icon.destroy();
            this.icon = null;
        }

        if (this.container) {
            this.container.destroy();
            this.container = null;
        }

        this.frames = null;
    }
}
