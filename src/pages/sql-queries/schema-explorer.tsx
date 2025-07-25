import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { runSql } from '@/runSql';
import LoadingScreen from '@/layouts/loading-screen';
import { generateFakeData } from '@/lib/generate-fake-data';

interface TableInfo {
  name: string;
  schema: ColumnInfo[];
  foreignKeys: ForeignKeyInfo[];
}

interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

interface ForeignKeyInfo {
  id: number;
  table: string;
  from: string;
  to: string;
}

const SchemaExplorer = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTables = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get list of tables
      const tableResult = await runSql(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      ) as any;

      const tableNames = tableResult.rows.map((row: any) => row.name);

      // Get schema and foreign keys for each table
      const tableSchemas: TableInfo[] = [];
      for (const tableName of tableNames) {
        const schemaResult = await runSql(`PRAGMA table_info("${tableName}")`) as any;
        const fkResult = await runSql(`PRAGMA foreign_key_list("${tableName}")`) as any;
        tableSchemas.push({
          name: tableName,
          schema: schemaResult.rows as ColumnInfo[],
          foreignKeys: fkResult.rows as ForeignKeyInfo[],
        });
      }

      setTables(tableSchemas);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch table information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  if (loading) {
    return (
      <LoadingScreen />
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Database Tables</h1>
        {/* <Button onClick={() => generateFakeData()}>Generate Fake Data</Button> */}
      </div>
      {tables.length === 0 ? (
        <p className="text-muted-foreground">No tables found in the database.</p>
      ) : (
        <Accordion type="multiple" className="w-full">
          {tables.map((table) => (
            <AccordionItem key={table.name} value={table.name}>
              <AccordionTrigger>Table: {table.name}</AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardHeader>
                    <CardTitle>Schema</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Column Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Not Null</TableHead>
                          <TableHead>Default Value</TableHead>
                          <TableHead>Primary Key</TableHead>
                          <TableHead>Foreign Key</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {table.schema.map((column) => (
                          <TableRow key={column.cid}>
                            <TableCell>{column.name}</TableCell>
                            <TableCell>{column.type}</TableCell>
                            <TableCell>{column.notnull ? 'Yes' : 'No'}</TableCell>
                            <TableCell>{column.dflt_value || '-'}</TableCell>
                            <TableCell>{column.pk ? 'Yes' : 'No'}</TableCell>
                            <TableCell>
                              {table.foreignKeys.find((fk) => fk.from === column.name)
                                ? `References ${table.foreignKeys.find((fk) => fk.from === column.name)!.table}(${table.foreignKeys.find((fk) => fk.from === column.name)!.to})`
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
};

export default SchemaExplorer;