import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import St from 'gi://St';
import Gio from 'gi://Gio';

export class Ladybug {

    constructor(extension) {
        this.dir = extension.dir;

        const assets = this.dir.get_child('assets');
        const walking = assets.get_child('ladybugs_1');
        const flying = assets.get_child('ladybugs_2');

        this.walkFrames = [
            walking.get_child('ladybug_1.png').get_path(),
            walking.get_child('ladybug_2.png').get_path(),
            walking.get_child('ladybug_3.png').get_path(),
        ];

        this.flightFrames = [
            flying.get_child('ladybug_1.png').get_path(),
            flying.get_child('ladybug_2.png').get_path(),
            flying.get_child('ladybug_3.png').get_path(),
        ];

        this.wingFrames = [
            flying.get_child('ladybug_01.png').get_path(),
            flying.get_child('ladybug_02.png').get_path(),
            flying.get_child('ladybug_03.png').get_path(),
        ];

        this.walkIcons = this.walkFrames.map(
            path => Gio.FileIcon.new(
                Gio.File.new_for_path(path)
            )
        );

        this.flightIcons = this.flightFrames.map(
            path => Gio.FileIcon.new(
                Gio.File.new_for_path(path)
            )
        );

        this.wingIcons = this.wingFrames.map(
            path => Gio.FileIcon.new(
                Gio.File.new_for_path(path)
            )
        );

        this.WALK_SIZE = 30;
        this.FLIGHT_SIZE = 30;

        this.container = new St.Bin({
            reactive: false,
        });

        this.container.set_size(
            this.WALK_SIZE,
            this.WALK_SIZE
        );

        this.container.set_pivot_point(
            0.5,
            0.5
        );

        this.icon = new St.Icon({
            gicon: this.walkIcons[0],
            icon_size: this.WALK_SIZE,
            reactive: false,
        });

        this.icon.set_pivot_point(
            0.5,
            0.5
        );

        this.container.set_child(this.icon);

        Main.layoutManager.addChrome(
            this.container
        );

        this.monitor =
            Main.layoutManager.primaryMonitor;

        this.posX =
            this.monitor.x +
            100 +
            Math.random() *
            Math.max(
                1,
                this.monitor.width - 200
            );

        this.posY =
            this.monitor.y +
            100 +
            Math.random() *
            Math.max(
                1,
                this.monitor.height - 200
            );

        this.angle =
            Math.random() * 360;

        this.speed =
            1.05;

        this.targetSpeed =
            1.25;

        this.angularVelocity =
            0;

        this.targetAngularVelocity =
            0;

        this.wanderForce =
            0;

        this.wanderTarget =
            0;

        this.directionTimer =
            0;

        this.speedTimer =
            0;

        this.pointerX =
            0;

        this.pointerY =
            0;

        this.previousPointerX =
            0;

        this.previousPointerY =
            0;

        this.pointerSpeed =
            0;

        this.CHASE_POINTER_SPEED =
            35;

        this.state =
            'walking';

        this.frameIndex =
            0;

        this.animationTime =
            0;

        this.flightStartX =
            0;

        this.flightStartY =
            0;

        this.flightControlX =
            0;

        this.flightControlY =
            0;

        this.flightControl2X =
            0;

        this.flightControl2Y =
            0;

        this.flightTargetX =
            0;

        this.flightTargetY =
            0;

        this.flightProgress =
            0;

        this.flightDuration =
            0.34;

        this.flightAngle =
            this.angle;

        this.isBeingChased =
            false;

        this.flightEscapeQueued =
            false;

        this.MOUSE_TRIGGER_DISTANCE =
            78;

        this.FLIGHT_MIN_DISTANCE =
            340;

        this.FLIGHT_MAX_DISTANCE =
            520;

        this.CHASE_DISTANCE =
            150;

        this.collisionRadius =
            17;

        this.container.set_position(
            this.posX,
            this.posY
        );
    }

    update(now, dt) {
        if (!this.container)
            return;

        this._updatePointer();

        this._updateState(now);

        this._updateAnimation(dt);

        if (this.state === 'walking') {
            this._moveWalking(dt);
        } else if (this.state === 'opening') {
            this._moveOpening(dt);
        } else if (this.state === 'flying') {
            this._moveFlying(dt);
        } else if (this.state === 'closing') {
            this._moveClosing(dt);
        }

        this.keepInsideMonitor();

        this.applyPosition();
    }

    _updatePointer() {
        const [
            x,
            y,
        ] = global.get_pointer();

        const dx =
            x -
            this.previousPointerX;

        const dy =
            y -
            this.previousPointerY;

        this.pointerSpeed =
            Math.hypot(
                dx,
                dy
            );

        this.pointerX =
            x;

        this.pointerY =
            y;

        this.previousPointerX =
            x;

        this.previousPointerY =
            y;
    }

    _updateState(now) {
        if (this.state === 'walking') {
            const dx =
                this.pointerX -
                this.posX;

            const dy =
                this.pointerY -
                this.posY;

            const distance =
                Math.hypot(
                    dx,
                    dy
                );

            if (
                distance <
                this.MOUSE_TRIGGER_DISTANCE
            ) {
                this._startOpening();
                return;
            }
        }

        if (this.state === 'flying') {
            this._updateChaseState();
        }

        if (this.state === 'closing') {
            return;
        }
    }

    _updateChaseState() {
        const dx =
            this.pointerX -
            this.posX;

        const dy =
            this.pointerY -
            this.posY;

        const distance =
            Math.hypot(
                dx,
                dy
            );

        const mouseIsClose =
            distance <
            this.CHASE_DISTANCE;

        const mouseIsMoving =
            this.pointerSpeed >
            this.CHASE_POINTER_SPEED;

        this.isBeingChased =
            mouseIsClose &&
            mouseIsMoving;

        if (
            mouseIsClose &&
            mouseIsMoving
        ) {
            this.flightEscapeQueued =
                true;
        }
    }

    _startOpening() {
        if (
            this.state !== 'walking'
        ) {
            return;
        }

        this.state =
            'opening';

        this.frameIndex =
            0;

        this.animationTime =
            0;

        this.container.set_size(
            this.FLIGHT_SIZE,
            this.FLIGHT_SIZE
        );

        this.icon.icon_size =
            this.FLIGHT_SIZE;

        this._setWingFrame(0);

        this._prepareFlight();
    }

    _prepareFlight() {
        this.monitor =
            Main.layoutManager.primaryMonitor;

        this.flightStartX =
            this.posX;

        this.flightStartY =
            this.posY;

        const margin =
            90;

        const minX =
            this.monitor.x +
            margin;

        const minY =
            this.monitor.y +
            margin;

        const maxX =
            this.monitor.x +
            this.monitor.width -
            this.FLIGHT_SIZE -
            margin;

        const maxY =
            this.monitor.y +
            this.monitor.height -
            this.FLIGHT_SIZE -
            margin;

        const centerX =
            this.monitor.x +
            this.monitor.width * 0.5;

        const centerY =
            this.monitor.y +
            this.monitor.height * 0.5;

        const awayX =
            this.posX -
            this.pointerX;

        const awayY =
            this.posY -
            this.pointerY;

        const awayDistance =
            Math.hypot(
                awayX,
                awayY
            );

        let directionX;
        let directionY;

        if (awayDistance > 0.001) {
            directionX =
                awayX /
                awayDistance;

            directionY =
                awayY /
                awayDistance;
        } else {
            const randomAngle =
                Math.random() *
                Math.PI *
                2;

            directionX =
                Math.cos(randomAngle);

            directionY =
                Math.sin(randomAngle);
        }

        const distanceFromLeft =
            this.posX -
            minX;

        const distanceFromRight =
            maxX -
            this.posX;

        const distanceFromTop =
            this.posY -
            minY;

        const distanceFromBottom =
            maxY -
            this.posY;

        const edgeInfluence =
            150;

        let edgeX = 0;
        let edgeY = 0;

        if (
            distanceFromLeft <
            edgeInfluence
        ) {
            const strength =
                (
                    edgeInfluence -
                    distanceFromLeft
                ) /
                edgeInfluence;

            edgeX +=
                strength *
                strength;
        }

        if (
            distanceFromRight <
            edgeInfluence
        ) {
            const strength =
                (
                    edgeInfluence -
                    distanceFromRight
                ) /
                edgeInfluence;

            edgeX -=
                strength *
                strength;
        }

        if (
            distanceFromTop <
            edgeInfluence
        ) {
            const strength =
                (
                    edgeInfluence -
                    distanceFromTop
                ) /
                edgeInfluence;

            edgeY +=
                strength *
                strength;
        }

        if (
            distanceFromBottom <
            edgeInfluence
        ) {
            const strength =
                (
                    edgeInfluence -
                    distanceFromBottom
                ) /
                edgeInfluence;

            edgeY -=
                strength *
                strength;
        }

        const centerXForce =
            centerX -
            this.posX;

        const centerYForce =
            centerY -
            this.posY;

        const centerDistance =
            Math.hypot(
                centerXForce,
                centerYForce
            );

        let centerXNormalized = 0;
        let centerYNormalized = 0;

        if (
            centerDistance >
            0.001
        ) {
            centerXNormalized =
                centerXForce /
                centerDistance;

            centerYNormalized =
                centerYForce /
                centerDistance;
        }

        directionX =
            directionX * 0.62 +
            edgeX * 0.90 +
            centerXNormalized * 0.12;

        directionY =
            directionY * 0.62 +
            edgeY * 0.90 +
            centerYNormalized * 0.12;

        const randomDirection =
            Math.random() *
            Math.PI *
            2;

        directionX +=
            Math.cos(
                randomDirection
            ) * 0.24;

        directionY +=
            Math.sin(
                randomDirection
            ) * 0.24;

        const directionLength =
            Math.hypot(
                directionX,
                directionY
            );

        if (
            directionLength >
            0.001
        ) {
            directionX /=
                directionLength;

            directionY /=
                directionLength;
        }

        const distanceToFly =
            this.FLIGHT_MIN_DISTANCE +
            Math.random() *
            (
                this.FLIGHT_MAX_DISTANCE -
                this.FLIGHT_MIN_DISTANCE
            );

        let targetX =
            this.posX +
            directionX *
            distanceToFly;

        let targetY =
            this.posY +
            directionY *
            distanceToFly;

        targetX =
            Math.max(
                minX,
                Math.min(
                    maxX,
                    targetX
                )
            );

        targetY =
            Math.max(
                minY,
                Math.min(
                    maxY,
                    targetY
                )
            );

        const targetDistance =
            Math.hypot(
                targetX -
                this.posX,
                targetY -
                this.posY
            );

        if (
            targetDistance <
            80
        ) {
            const fallbackX =
                centerX -
                this.posX;

            const fallbackY =
                centerY -
                this.posY;

            const fallbackDistance =
                Math.hypot(
                    fallbackX,
                    fallbackY
                );

            if (
                fallbackDistance >
                0.001
            ) {
                targetX =
                    this.posX +
                    (
                        fallbackX /
                        fallbackDistance
                    ) *
                    Math.min(
                        220,
                        Math.max(
                            80,
                            this.monitor.width *
                            0.25
                        )
                    );

                targetY =
                    this.posY +
                    (
                        fallbackY /
                        fallbackDistance
                    ) *
                    Math.min(
                        220,
                        Math.max(
                            80,
                            this.monitor.height *
                            0.25
                        )
                    );

                targetX =
                    Math.max(
                        minX,
                        Math.min(
                            maxX,
                            targetX
                        )
                    );

                targetY =
                    Math.max(
                        minY,
                        Math.min(
                            maxY,
                            targetY
                        )
                    );
            }
        }

        this.flightTargetX =
            targetX;

        this.flightTargetY =
            targetY;

        const directX =
            targetX -
            this.posX;

        const directY =
            targetY -
            this.posY;

        const directDistance =
            Math.hypot(
                directX,
                directY
            );

        let normalX = 0;
        let normalY = 0;

        if (
            directDistance >
            0.001
        ) {
            normalX =
                -directY /
                directDistance;

            normalY =
                directX /
                directDistance;
        }

        const randomSide =
            Math.random() < 0.5
                ? -1
                : 1;

        const curveAmount =
            (
                0.30 +
                Math.random() *
                0.30
            ) *
            Math.min(
                230,
                Math.max(
                    80,
                    directDistance *
                    0.52
                )
            ) *
            randomSide;

        const secondaryCurve =
            (
                0.18 +
                Math.random() *
                0.22
            ) *
            Math.min(
                170,
                Math.max(
                    50,
                    directDistance *
                    0.34
                )
            ) *
            -randomSide;

        let controlX =
            this.posX +
            directX *
            (
                0.25 +
                Math.random() *
                0.10
            ) +
            normalX *
            curveAmount;

        let controlY =
            this.posY +
            directY *
            (
                0.25 +
                Math.random() *
                0.10
            ) +
            normalY *
            curveAmount;

        let control2X =
            this.posX +
            directX *
            (
                0.72 +
                Math.random() *
                0.10
            ) +
            normalX *
            secondaryCurve;

        let control2Y =
            this.posY +
            directY *
            (
                0.72 +
                Math.random() *
                0.10
            ) +
            normalY *
            secondaryCurve;

        controlX =
            Math.max(
                minX,
                Math.min(
                    maxX,
                    controlX
                )
            );

        controlY =
            Math.max(
                minY,
                Math.min(
                    maxY,
                    controlY
                )
            );

        control2X =
            Math.max(
                minX,
                Math.min(
                    maxX,
                    control2X
                )
            );

        control2Y =
            Math.max(
                minY,
                Math.min(
                    maxY,
                    control2Y
                )
            );

        this.flightControlX =
            controlX;

        this.flightControlY =
            controlY;

        this.flightControl2X =
            control2X;

        this.flightControl2Y =
            control2Y;

        this.flightDuration =
            0.34 +
            Math.random() *
            0.10;

        this.flightProgress =
            0;

        this.flightAngle =
            Math.atan2(
                directY,
                directX
            ) *
            180 /
            Math.PI;

        this.flightEscapeQueued =
            false;
    }

    _startFlying() {
        this.state =
            'flying';

        this.frameIndex =
            0;

        this.animationTime =
            0;

        this._setFlightFrame(0);
    }

    _moveFlying(dt) {
        this.flightProgress +=
            dt /
            this.flightDuration;

        const t =
            Math.min(
                1,
                this.flightProgress
            );

        const smoothT =
            t * t *
            t *
            (
                t *
                (
                    t * 6 -
                    15
                ) +
                10
            );

        const oneMinus =
            1 -
            smoothT;

        const x =
            oneMinus *
            oneMinus *
            oneMinus *
            this.flightStartX +

            3 *
            oneMinus *
            oneMinus *
            smoothT *
            this.flightControlX +

            3 *
            oneMinus *
            smoothT *
            smoothT *
            this.flightControl2X +

            smoothT *
            smoothT *
            smoothT *
            this.flightTargetX;

        const y =
            oneMinus *
            oneMinus *
            oneMinus *
            this.flightStartY +

            3 *
            oneMinus *
            oneMinus *
            smoothT *
            this.flightControlY +

            3 *
            oneMinus *
            smoothT *
            smoothT *
            this.flightControl2Y +

            smoothT *
            smoothT *
            smoothT *
            this.flightTargetY;

        const lookT =
            Math.min(
                1,
                t + 0.035
            );

        const lookSmooth =
            lookT *
            lookT *
            lookT *
            (
                lookT *
                (
                    lookT * 6 -
                    15
                ) +
                10
            );

        const lookOneMinus =
            1 -
            lookSmooth;

        const nextX =
            lookOneMinus *
            lookOneMinus *
            lookOneMinus *
            this.flightStartX +

            3 *
            lookOneMinus *
            lookOneMinus *
            lookSmooth *
            this.flightControlX +

            3 *
            lookOneMinus *
            lookSmooth *
            lookSmooth *
            this.flightControl2X +

            lookSmooth *
            lookSmooth *
            lookSmooth *
            this.flightTargetX;

        const nextY =
            lookOneMinus *
            lookOneMinus *
            lookOneMinus *
            this.flightStartY +

            3 *
            lookOneMinus *
            lookOneMinus *
            lookSmooth *
            this.flightControlY +

            3 *
            lookOneMinus *
            lookSmooth *
            lookSmooth *
            this.flightControl2Y +

            lookSmooth *
            lookSmooth *
            lookSmooth *
            this.flightTargetY;

        const moveX =
            nextX -
            x;

        const moveY =
            nextY -
            y;

        if (
            Math.abs(moveX) +
            Math.abs(moveY) >
            0.001
        ) {
            const targetAngle =
                Math.atan2(
                    moveY,
                    moveX
                ) *
                180 /
                Math.PI;

            this.flightAngle =
                this._smoothAngle(
                    this.flightAngle,
                    targetAngle,
                    0.28
                );

            this.angle =
                this.flightAngle;
        }

        this.posX =
            x;

        this.posY =
            y;

        if (
            this.flightProgress >= 1
        ) {
            this.posX =
                this.flightTargetX;

            this.posY =
                this.flightTargetY;

            this._decideAfterFlight();
        }
    }

    _decideAfterFlight() {
        const dx =
            this.pointerX -
            this.posX;

        const dy =
            this.pointerY -
            this.posY;

        const distance =
            Math.hypot(
                dx,
                dy
            );

        const mouseIsClose =
            distance <
            this.CHASE_DISTANCE;

        const mouseIsMoving =
            this.pointerSpeed >
            this.CHASE_POINTER_SPEED;

        if (
            mouseIsClose &&
            mouseIsMoving
        ) {
            this.isBeingChased =
                true;

            this.flightEscapeQueued =
                true;

            this.state =
                'opening';

            this.frameIndex =
                0;

            this.animationTime =
                0;

            this.container.set_size(
                this.FLIGHT_SIZE,
                this.FLIGHT_SIZE
            );

            this.icon.icon_size =
                this.FLIGHT_SIZE;

            this._setWingFrame(0);

            this._prepareFlight();

            return;
        }

        this.isBeingChased =
            false;

        this.flightEscapeQueued =
            false;

        this._startClosing();
    }

    _startClosing() {
        if (
            this.state !== 'flying'
        ) {
            return;
        }

        this.state =
            'closing';

        this.frameIndex =
            this.wingFrames.length -
            1;

        this.animationTime =
            0;

        this._setWingFrame(
            this.frameIndex
        );
    }

    _startWalking() {
        this.state =
            'walking';

        this.frameIndex =
            0;

        this.animationTime =
            0;

        this.container.set_size(
            this.WALK_SIZE,
            this.WALK_SIZE
        );

        this.icon.icon_size =
            this.WALK_SIZE;

        this._setWalkFrame(0);

        this.angle +=
            (
                Math.random() -
                0.5
            ) *
            70;

        this.targetSpeed =
            0.95 +
            Math.random() *
            0.75;

        this.wanderTarget =
            0;

        this.targetAngularVelocity =
            0;

        this.isBeingChased =
            false;

        this.flightEscapeQueued =
            false;
    }

    _updateAnimation(dt) {
        this.animationTime +=
            dt;

        if (
            this.state === 'walking'
        ) {
            if (
                this.animationTime <
                0.048
            ) {
                return;
            }

            this.animationTime =
                0;

            this.frameIndex =
                (
                    this.frameIndex +
                    1
                ) %
                this.walkFrames.length;

            this._setWalkFrame(
                this.frameIndex
            );

            return;
        }

        if (
            this.state === 'opening'
        ) {
            if (
                this.animationTime <
                0.032
            ) {
                return;
            }

            this.animationTime =
                0;

            this.frameIndex++;

            if (
                this.frameIndex >=
                this.wingFrames.length
            ) {
                this._startFlying();
                return;
            }

            this._setWingFrame(
                this.frameIndex
            );

            return;
        }

        if (
            this.state === 'flying'
        ) {
            if (
                this.animationTime <
                0.018
            ) {
                return;
            }

            this.animationTime =
                0;

            this.frameIndex =
                (
                    this.frameIndex +
                    1
                ) %
                this.flightFrames.length;

            this._setFlightFrame(
                this.frameIndex
            );

            return;
        }

        if (
            this.state === 'closing'
        ) {
            if (
                this.animationTime <
                0.032
            ) {
                return;
            }

            this.animationTime =
                0;

            this.frameIndex--;

            if (
                this.frameIndex < 0
            ) {
                this._startWalking();
                return;
            }

            this._setWingFrame(
                this.frameIndex
            );
        }
    }

    _setWalkFrame(index) {
        if (!this.icon)
            return;

        this.icon.set_gicon(
            this.walkIcons[index]
        );
    }

    _setFlightFrame(index) {
        if (!this.icon)
            return;

        this.icon.set_gicon(
            this.flightIcons[index]
        );
    }

    _setWingFrame(index) {
        if (!this.icon)
            return;

        this.icon.set_gicon(
            this.wingIcons[index]
        );
    }

    _moveWalking(dt) {
        this.directionTimer -=
            dt;

        if (
            this.directionTimer <= 0
        ) {
            this.directionTimer =
                0.35 +
                Math.random() *
                0.75;

            this.wanderTarget =
                (
                    Math.random() -
                    0.5
                ) *
                2.4;
        }

        this.wanderForce +=
            (
                this.wanderTarget -
                this.wanderForce
            ) *
            0.035;

        const edgeForce =
            this._edgeAvoidance();

        const edgeSteering =
            edgeForce *
            0.22;

        this.targetAngularVelocity =
            this.wanderForce +
            edgeSteering;

        this.angularVelocity +=
            (
                this.targetAngularVelocity -
                this.angularVelocity
            ) *
            0.12;

        this.angularVelocity *=
            0.985;

        this.angularVelocity =
            Math.max(
                -4.5,
                Math.min(
                    4.5,
                    this.angularVelocity
                )
            );

        this.angle +=
            this.angularVelocity;

        this.speedTimer -=
            dt;

        if (
            this.speedTimer <= 0
        ) {
            this.speedTimer =
                0.8 +
                Math.random() *
                1.8;

            this.targetSpeed =
                0.85 +
                Math.random() *
                0.9;
        }

        this.speed +=
            (
                this.targetSpeed -
                this.speed
            ) *
            0.035;

        const turnFactor =
            1 -
            Math.min(
                0.22,
                Math.abs(
                    this.angularVelocity
                ) /
                22
            );

        const currentSpeed =
            this.speed *
            turnFactor;

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
    }

    _moveOpening(dt) {
        const radians =
            this.angle *
            Math.PI /
            180;

        const openingSpeed =
            0.16 *
            Math.min(
                1,
                dt * 60
            );

        this.posX +=
            Math.cos(
                radians
            ) *
            openingSpeed;

        this.posY +=
            Math.sin(
                radians
            ) *
            openingSpeed;
    }

    _moveClosing(dt) {
        return;
    }

    _edgeAvoidance() {
        const monitor =
            this.monitor;

        const margin =
            110;

        let forceX =
            0;

        let forceY =
            0;

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

        if (
            left < margin
        ) {
            const strength =
                (
                    margin -
                    left
                ) /
                margin;

            forceX +=
                strength *
                strength;
        }

        if (
            right < margin
        ) {
            const strength =
                (
                    margin -
                    right
                ) /
                margin;

            forceX -=
                strength *
                strength;
        }

        if (
            top < margin
        ) {
            const strength =
                (
                    margin -
                    top
                ) /
                margin;

            forceY +=
                strength *
                strength;
        }

        if (
            bottom < margin
        ) {
            const strength =
                (
                    margin -
                    bottom
                ) /
                margin;

            forceY -=
                strength *
                strength;
        }

        if (
            Math.abs(forceX) +
            Math.abs(forceY) <
            0.001
        ) {
            return 0;
        }

        const targetAngle =
            Math.atan2(
                forceY,
                forceX
            ) *
            180 /
            Math.PI;

        return this._angleDiff(
            targetAngle,
            this.angle
        );
    }

    _smoothAngle(
        current,
        target,
        amount
    ) {
        const difference =
            this._angleDiff(
                target,
                current
            );

        return current +
            difference *
            amount;
    }

    _angleDiff(
        target,
        current
    ) {
        let diff =
            (
                target -
                current
            ) %
            360;

        if (
            diff > 180
        ) {
            diff -= 360;
        }

        if (
            diff < -180
        ) {
            diff += 360;
        }

        return diff;
    }

    keepInsideMonitor() {
        this.monitor =
            Main.layoutManager.primaryMonitor;

        const margin =
            8;

        const minX =
            this.monitor.x +
            margin;

        const minY =
            this.monitor.y +
            margin;

        const size =
            this.state === 'walking'
                ? this.WALK_SIZE
                : this.FLIGHT_SIZE;

        const maxX =
            this.monitor.x +
            this.monitor.width -
            size -
            margin;

        const maxY =
            this.monitor.y +
            this.monitor.height -
            size -
            margin;

        this.posX =
            Math.max(
                minX,
                Math.min(
                    maxX,
                    this.posX
                )
            );

        this.posY =
            Math.max(
                minY,
                Math.min(
                    maxY,
                    this.posY
                )
            );
    }

    applyPosition() {
        if (!this.container)
            return;

        this.container.set_position(
            this.posX,
            this.posY
        );

        if (this.icon) {
            this.icon.rotation_angle_z =
                this.angle + 90;
        }
    }

    destroy() {
        if (this.icon) {
            this.icon.destroy();
            this.icon = null;
        }

        if (this.container) {
            this.container.destroy();
            this.container = null;
        }

        this.walkFrames = null;
        this.flightFrames = null;
        this.wingFrames = null;

        this.walkIcons = null;
        this.flightIcons = null;
        this.wingIcons = null;
    }
}
