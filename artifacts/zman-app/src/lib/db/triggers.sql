-- Single function, attached to every table with an updated_at column.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Attach to every table that has updated_at.
-- One trigger per table, fires BEFORE UPDATE.

create trigger purchase_set_updated_at
  before update on purchase
  for each row execute function set_updated_at();

create trigger expense_set_updated_at
  before update on expense
  for each row execute function set_updated_at();

create trigger sale_set_updated_at
  before update on sale
  for each row execute function set_updated_at();

create trigger order_set_updated_at
  before update on "order"
  for each row execute function set_updated_at();

create trigger order_component_set_updated_at
  before update on order_component
  for each row execute function set_updated_at();
