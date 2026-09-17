import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GLib from 'gi://GLib';

import {
    ExtensionPreferences,
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class AmbedFlyPreferences
    extends ExtensionPreferences {

    fillPreferencesWindow(window) {
        const settings =
            this.getSettings();

        const arabic =
            this._isArabic();

        window.set_default_size(
            620,
            650
        );

        window.set_title(
            'Ambed Fly'
        );

        window.set_direction(
            arabic
                ? Gtk.TextDirection.RTL
                : Gtk.TextDirection.LTR
        );

        // --- Header bar with custom window controls ---
        const headerBar =
            new Adw.HeaderBar();

        headerBar.title_widget =
            new Adw.WindowTitle({
                title: 'Ambed Fly',
            });

        // Prevent Adw.HeaderBar from also drawing the OS's own
        // native title buttons (which caused a duplicate Close
        // button alongside our custom one below).
        headerBar.show_start_title_buttons = false;
        headerBar.show_end_title_buttons = false;

        const minimizeButton =
            new Gtk.Button({
                icon_name:
                    'window-minimize-symbolic',

                tooltip_text:
                    arabic
                        ? 'تصغير'
                        : 'Minimize',
            });

        minimizeButton.connect(
            'clicked',
            () => {
                window.minimize();
            }
        );

        const maximizeButton =
            new Gtk.Button({
                icon_name:
                    'window-maximize-symbolic',

                tooltip_text:
                    arabic
                        ? 'تكبير'
                        : 'Maximize',
            });

        maximizeButton.connect(
            'clicked',
            () => {
                if (window.is_maximized()) {
                    window.unmaximize();
                } else {
                    window.maximize();
                }
            }
        );

        // Keep the icon in sync even if maximize state
        // changes from outside our button (keyboard shortcut, etc.)
        window.connect(
            'notify::maximized',
            () => {
                maximizeButton.set_icon_name(
                    window.is_maximized()
                        ? 'window-restore-symbolic'
                        : 'window-maximize-symbolic'
                );
            }
        );

        const closeButton =
            new Gtk.Button({
                icon_name:
                    'window-close-symbolic',

                tooltip_text:
                    arabic
                        ? 'إغلاق'
                        : 'Close',
            });

        closeButton.connect(
            'clicked',
            () => {
                window.close();
            }
        );

        headerBar.pack_start(
            minimizeButton
        );

        headerBar.pack_start(
            maximizeButton
        );

        headerBar.pack_end(
            closeButton
        );

        // --- Body content ---
        const scroller =
            new Gtk.ScrolledWindow({
                hscrollbar_policy:
                    Gtk.PolicyType.NEVER,

                vscrollbar_policy:
                    Gtk.PolicyType.AUTOMATIC,

                hexpand: true,
                vexpand: true,
            });

        const content =
            new Gtk.Box({
                orientation:
                    Gtk.Orientation.VERTICAL,

                spacing: 18,

                margin_top: 24,
                margin_bottom: 28,
                margin_start: 24,
                margin_end: 24,

                hexpand: true,
            });

        const title =
            new Gtk.Label({
                label: 'Ambed Fly',

                halign:
                    Gtk.Align.START,

                xalign: 0,

                margin_bottom: 4,
            });

        title.add_css_class(
            'title-2'
        );

        content.append(
            title
        );

        const group =
            new Adw.PreferencesGroup({
                title:
                    arabic
                        ? 'الحشرات'
                        : 'Creatures',

                description:
                    arabic
                        ? 'اختر نوع الحشرات وعددها التي تظهر على سطح المكتب.'
                        : 'Choose which creatures appear on the desktop.',
            });

        const model =
            Gtk.StringList.new(
                arabic
                    ? [
                        'الذبابة فقط',
                        'الدعسوقة فقط',
                        'كلاهما',
                    ]
                    : [
                        'Fly only',
                        'Ladybug only',
                        'Both',
                    ]
            );

        const typeRow =
            new Adw.ComboRow({
                title:
                    arabic
                        ? 'نوع الحشرات'
                        : 'Creature type',

                subtitle:
                    arabic
                        ? 'حدد الحشرات التي تريد ظهورها.'
                        : 'Choose which creatures you want to see.',

                model: model,
            });

        const type =
            settings.get_string(
                'creature-type'
            );

        if (type === 'ladybug') {
            typeRow.selected = 1;
        } else if (type === 'both') {
            typeRow.selected = 2;
        } else {
            typeRow.selected = 0;
        }

        typeRow.connect(
            'notify::selected',
            () => {
                const values = [
                    'fly',
                    'ladybug',
                    'both',
                ];

                settings.set_string(
                    'creature-type',
                    values[
                        typeRow.selected
                    ]
                );
            }
        );

        group.add(
            typeRow
        );

        const countRow =
            new Adw.SpinRow({
                title:
                    arabic
                        ? 'عدد الحشرات'
                        : 'Number of creatures',

                subtitle:
                    arabic
                        ? 'العدد الإجمالي للحشرات على سطح المكتب.'
                        : 'Total number of creatures on the desktop.',

                adjustment:
                    new Gtk.Adjustment({
                        lower: 1,
                        upper: 6,
                        step_increment: 1,
                        page_increment: 1,

                        value:
                            settings.get_int(
                                'creature-count'
                            ),
                    }),

                numeric: true,
            });

        countRow.connect(
            'notify::value',
            () => {
                settings.set_int(
                    'creature-count',
                    Math.round(
                        countRow.value
                    )
                );
            }
        );

        group.add(
            countRow
        );

        content.append(
            group
        );

        const spacer =
            new Gtk.Box({
                orientation:
                    Gtk.Orientation.VERTICAL,

                height_request: 10,
            });

        content.append(
            spacer
        );

        const imageFile =
            this.dir
                .get_child('assets')
                .get_child('Ambed.png');

        const image =
            Gtk.Picture.new_for_filename(
                imageFile.get_path()
            );

        image.content_fit =
            Gtk.ContentFit.CONTAIN;

        image.can_shrink = true;

        image.width_request =
            390;

        image.height_request =
            210;

        image.halign =
            Gtk.Align.CENTER;

        image.valign =
            Gtk.Align.CENTER;

        content.append(
            image
        );

        const github =
            Gtk.LinkButton.new_with_label(
                'https://github.com/walid-rouibah/ambed-fly',

                arabic
                    ? 'مستودع Ambed Fly على GitHub'
                    : 'Ambed Fly on GitHub'
            );

        github.halign =
            Gtk.Align.CENTER;

        content.append(
            github
        );

        scroller.set_child(
            content
        );

        // --- Assemble: ToolbarView holds the header bar + body ---
        const toolbarView =
            new Adw.ToolbarView();

        toolbarView.add_top_bar(
            headerBar
        );

        toolbarView.set_content(
            scroller
        );

        window.set_content(
            toolbarView
        );
    }

    _isArabic() {
        const languages =
            GLib.get_language_names();

        for (const language of languages) {
            const value =
                language.toLowerCase();

            if (
                value === 'ar' ||
                value.startsWith('ar_') ||
                value.startsWith('ar-')
            ) {
                return true;
            }
        }

        return false;
    }
}
