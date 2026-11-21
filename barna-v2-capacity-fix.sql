-- Enforce event capacity for both pending and approved registrations.
-- The trigger locks the event row to prevent simultaneous registrations exceeding capacity.
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.enforce_event_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_capacity integer;
  v_count bigint;
BEGIN
  SELECT capacity INTO v_capacity
  FROM public.events
  WHERE id = NEW.event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ایونت پیدا نشد.' USING ERRCODE = '23503';
  END IF;

  IF v_capacity IS NOT NULL THEN
    SELECT count(*) INTO v_count
    FROM public.event_registrations
    WHERE event_id = NEW.event_id
      AND status IN ('pending', 'approved');

    IF v_count >= v_capacity THEN
      RAISE EXCEPTION 'ظرفیت این ایونت تکمیل شده است.' USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_event_capacity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_event_capacity_before_insert ON public.event_registrations;
CREATE TRIGGER enforce_event_capacity_before_insert
BEFORE INSERT ON public.event_registrations
FOR EACH ROW EXECUTE FUNCTION private.enforce_event_capacity();
