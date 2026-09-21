create index if not exists food_submissions_scan_analysis_idx
  on public.food_submissions (scan_analysis_id)
  where scan_analysis_id is not null;

create index if not exists food_submissions_reviewer_idx
  on public.food_submissions (reviewed_by)
  where reviewed_by is not null;
