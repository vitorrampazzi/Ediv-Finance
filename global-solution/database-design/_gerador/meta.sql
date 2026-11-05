SET MARKUP CSV ON QUOTE ON
SET FEEDBACK OFF HEADING ON PAGESIZE 50000 LONG 4000 LINESIZE 4000 TRIMSPOOL ON
SPOOL /tmp/cols.csv
SELECT table_name, column_id, column_name, data_type, data_length, data_precision, data_scale, nullable, data_default
  FROM user_tab_columns WHERE table_name LIKE 'T\_EC\_%' ESCAPE '\' ORDER BY table_name, column_id;
SPOOL OFF
SPOOL /tmp/cons.csv
SELECT c.table_name, c.constraint_name, c.constraint_type, cc.column_name, cc.position,
       r.table_name AS r_table, rc.column_name AS r_column, c.search_condition_vc
  FROM user_constraints c
  JOIN user_cons_columns cc ON cc.constraint_name = c.constraint_name
  LEFT JOIN user_constraints r ON r.constraint_name = c.r_constraint_name
  LEFT JOIN user_cons_columns rc ON rc.constraint_name = c.r_constraint_name AND rc.position = cc.position
 WHERE c.table_name LIKE 'T\_EC\_%' ESCAPE '\'
 ORDER BY c.table_name, c.constraint_type, c.constraint_name, cc.position;
SPOOL OFF
SPOOL /tmp/tcom.csv
SELECT table_name, comments FROM user_tab_comments WHERE table_name LIKE 'T\_EC\_%' ESCAPE '\' ORDER BY table_name;
SPOOL OFF
EXIT
