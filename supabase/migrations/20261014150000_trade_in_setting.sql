-- Grail Noir: trade-in for site credit is a setting super admins switch on the Configuration page.
-- true: players can trade pieces in for credit. false: pieces are kept or shipped, and the site's
-- wording changes to match. The site reads it with the catalogue, so a change shows at once.
-- (The box system's API still offers trade-in until the backend developer turns it off there.)

insert into public.settings (key, value) values ('trade_in_enabled', 'true')
on conflict (key) do nothing;
