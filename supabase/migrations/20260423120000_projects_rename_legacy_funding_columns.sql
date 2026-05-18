-- If an older revision created funding_goal_dzd / funding_raised_dzd, rename to canonical columns.

-- Skip when target_amount / current_amount already exist (e.g. added manually).



do $$

begin

  if exists (

    select 1

    from information_schema.columns

    where table_schema = 'public'

      and table_name = 'projects'

      and column_name = 'funding_goal_dzd'

  )

  and not exists (

    select 1

    from information_schema.columns

    where table_schema = 'public'

      and table_name = 'projects'

      and column_name = 'target_amount'

  ) then

    alter table public.projects rename column funding_goal_dzd to target_amount;

  end if;

end $$;



do $$

begin

  if exists (

    select 1

    from information_schema.columns

    where table_schema = 'public'

      and table_name = 'projects'

      and column_name = 'funding_raised_dzd'

  )

  and not exists (

    select 1

    from information_schema.columns

    where table_schema = 'public'

      and table_name = 'projects'

      and column_name = 'current_amount'

  ) then

    alter table public.projects rename column funding_raised_dzd to current_amount;

  end if;

end $$;


