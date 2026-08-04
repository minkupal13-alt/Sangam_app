/*
# Phase 4 — Add caption and bg_gradient to stories table

## Overview
The stories table (created in phase 1) needs two new columns to support
text stories with gradient backgrounds and caption overlays.

## Changes
1. stories.caption (text, nullable) — optional text overlay or caption.
2. stories.bg_gradient (text, nullable) — CSS gradient string for text stories.

## Security
No RLS changes needed — existing stories policies cover the new columns.
*/

ALTER TABLE stories ADD COLUMN IF NOT EXISTS caption text;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS bg_gradient text;
