-- Allow household members to edit recorded settlements (Category 3.4)
DROP POLICY IF EXISTS settlements_update ON public.household_settlements;
CREATE POLICY settlements_update ON public.household_settlements
  FOR UPDATE
  USING (private.is_household_member(household_id))
  WITH CHECK (private.is_household_member(household_id));
