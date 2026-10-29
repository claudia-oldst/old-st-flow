# Add the Old.St Feedback widget to Pulse

Paste the widget script you gave just before `</body>` in `index.html`, so it loads once on every page. The key is a public site key, so it can live in the page.

```html
<script src="https://dqpgjriwudzmhcfyhbpa.supabase.co/storage/v1/object/public/widgets/v1/widget.js"
  data-key="fbk_rrbOW7m_xTy0HEeZ4FXhuZXXPTyB-OFOk40B7rxIHlY" data-theme="auto" async></script>
```

## Before it will work (in the Thalamus staff app)
For this site, the **Allowed origins** must include every address Pulse runs on:
- `https://oldst-pulse.lovable.app` (published)
- `https://id-preview--0df2b10b-315f-4562-bf92-86dd89c36528.lovable.app` (preview, if you want to test there)

After that, check it in the preview: the widget button should appear and load without errors.
