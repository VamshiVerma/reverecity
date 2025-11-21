-- Add INSERT and UPDATE policies for police_logs tables

-- Allow public insert access to police logs
CREATE POLICY "Allow public insert access to police logs"
  ON public.police_logs
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow public update access to police logs
CREATE POLICY "Allow public update access to police logs"
  ON public.police_logs
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Allow public insert access to sync status
CREATE POLICY "Allow public insert access to sync status"
  ON public.police_logs_sync_status
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow public update access to sync status
CREATE POLICY "Allow public update access to sync status"
  ON public.police_logs_sync_status
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);
