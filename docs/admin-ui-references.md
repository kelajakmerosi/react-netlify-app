# Admin UI Reference Notes

Kelajak Merosi `/admin` workspace was redesigned using architecture inspiration from these OSS dashboards:

1. `satnaing/shadcn-admin`
   - https://github.com/satnaing/shadcn-admin
   - Used as reference for tabbed workspace composition and KPI + chart hierarchy.

2. `TailAdmin/free-react-tailwind-admin-dashboard`
   - https://github.com/TailAdmin/free-react-tailwind-admin-dashboard
   - Used as reference for dense analytics card layout, chart header structure, and panel rhythm.

3. `coreui/coreui-free-react-admin-template`
   - https://github.com/coreui/coreui-free-react-admin-template
   - Used as reference for operations-centric table/toolbars and admin action ergonomics.

## Adaptation approach

- No source files or styling frameworks were copied from these repositories.
- Existing Kelajak Merosi stack/components were retained (`GlassCard`, `Button`, CSS modules, existing services).
- Structure, spacing rhythm, and information architecture patterns were adapted to this project’s visual system.
