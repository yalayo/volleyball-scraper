import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState, useMemo } from "react";

interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  searchable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchPlaceholder?: string;
}

export default function DataTable<T extends { id: number }>({ 
  data, 
  columns, 
  loading,
  searchPlaceholder = "Search..."
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");

  const extractTextContent = (element: any): string => {
    if (typeof element === 'string') return element;
    if (typeof element === 'number') return element.toString();
    if (!element) return '';
    
    if (element.props && element.props.children) {
      if (Array.isArray(element.props.children)) {
        return element.props.children.map(extractTextContent).join(' ');
      }
      return extractTextContent(element.props.children);
    }
    
    return '';
  };

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    return data.filter((item) => {
      return columns.some((column) => {
        if (column.searchable === false) return false;
        
        const cellContent = column.render(item);
        if (typeof cellContent === 'string') {
          return cellContent.toLowerCase().includes(searchTerm.toLowerCase());
        }
        
        // Handle React elements by extracting text content
        if (cellContent && typeof cellContent === 'object' && 'props' in cellContent) {
          const textContent = extractTextContent(cellContent);
          return textContent.toLowerCase().includes(searchTerm.toLowerCase());
        }
        
        return false;
      });
    });
  }, [data, searchTerm, columns, extractTextContent]);
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          disabled={loading}
          className="pl-9"
        />
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key}>{column.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : filteredData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-8 text-gray-500">
                {searchTerm ? "No results found" : "No data available"}
              </TableCell>
            </TableRow>
          ) : (
            filteredData.map((item) => (
              <TableRow key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    {column.render(item)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
