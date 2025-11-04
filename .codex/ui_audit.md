# UI Bug Audit

| Selector | Issue | Fix |
| --- | --- | --- |
| `.binder-card img` | Card art stretched or mismatched heights between binder slots due to inconsistent sizing and captions expanding containers. | Enforced a 5:7 aspect ratio, wrapped art in a dedicated container, and clamped captions to two lines so every slot reserves consistent space. |
| `.binder-page` | Rows collapsed unevenly when fewer cards were present, causing layout shift on pagination. | Applied `grid-auto-rows: 1fr` and normalized binder card layout to equalize track heights. |
| `.card-cell img` | Table thumbnails loaded without constraints, leading to CLS and inconsistent presentation. | Added lazy loading, explicit aspect ratio, and fallback placeholders to stabilize thumbnail cells. |
