"""Lê os metadados exportados do Oracle (CSV) e monta o modelo usado no diagrama
e no dicionário de dados."""
import csv
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def _read(name):
    with open(os.path.join(HERE, name), encoding="utf-8") as f:
        lines = [ln for ln in f.read().splitlines() if ln.strip()]
    # o SQL*Plus corta o fechamento de aspas de colunas LONG (DATA_DEFAULT)
    lines = [ln + '"' if ln.count('"') % 2 else ln for ln in lines]
    return list(csv.DictReader(lines))


def fmt_type(c):
    t = c["DATA_TYPE"]
    if t == "NUMBER":
        p, s = c["DATA_PRECISION"], c["DATA_SCALE"]
        if p and s and s != "0":
            return f"NUMBER({p},{s})"
        if p:
            return f"NUMBER({p})"
        return "NUMBER"
    if t in ("VARCHAR2", "CHAR"):
        return f"{t}({c['DATA_LENGTH']})"
    return t


def load():
    cols = _read("cols.csv")
    cons = _read("cons.csv")
    tcom = {r["TABLE_NAME"]: r["COMMENTS"] for r in _read("tcom.csv")}

    tables = {}
    for c in cols:
        t = tables.setdefault(c["TABLE_NAME"], {"name": c["TABLE_NAME"], "columns": []})
        default = (c["DATA_DEFAULT"] or "").strip()
        t["columns"].append({
            "name": c["COLUMN_NAME"].lower(),
            "type": fmt_type(c),
            "nullable": c["NULLABLE"] == "Y",
            "default": default if default else None,
            "pk": False, "fk": None, "uk": False,
        })

    def col(tn, cn):
        for c in tables[tn]["columns"]:
            if c["name"] == cn.lower():
                return c
        raise KeyError((tn, cn))

    fks = {}
    checks = []
    uniques = {}
    pks = {}
    for r in cons:
        tn, cn, kind = r["TABLE_NAME"], r["CONSTRAINT_NAME"], r["CONSTRAINT_TYPE"]
        if kind == "P":
            col(tn, r["COLUMN_NAME"])["pk"] = True
            pks.setdefault(tn, []).append(r["COLUMN_NAME"].lower())
        elif kind == "U":
            col(tn, r["COLUMN_NAME"])["uk"] = True
            uniques.setdefault((tn, cn), []).append(r["COLUMN_NAME"].lower())
        elif kind == "R":
            col(tn, r["COLUMN_NAME"])["fk"] = r["R_TABLE"]
            fk = fks.setdefault(cn, {"name": cn, "child": tn, "parent": r["R_TABLE"], "columns": []})
            fk["columns"].append(r["COLUMN_NAME"].lower())
        elif kind == "C" and not cn.startswith("SYS_"):
            checks.append({"table": tn, "name": cn, "condition": r["SEARCH_CONDITION_VC"]})

    for fk in fks.values():
        fk["optional"] = all(col(fk["child"], c)["nullable"] for c in fk["columns"])

    for t in tables.values():
        t["comment"] = tcom.get(t["name"], "")

    return {
        "tables": tables,
        "fks": list(fks.values()),
        "checks": checks,
        "uniques": [{"table": k[0], "name": k[1], "columns": v} for k, v in uniques.items()],
        "pks": pks,
    }


if __name__ == "__main__":
    m = load()
    print(len(m["tables"]), "tabelas;", sum(len(t["columns"]) for t in m["tables"].values()), "colunas;",
          len(m["fks"]), "FKs;", len(m["checks"]), "checks;", len(m["uniques"]), "uniques")
    for fk in m["fks"]:
        print(f"  {fk['parent']:24} -> {fk['child']:24} {fk['columns']} {'(opcional)' if fk['optional'] else ''}")
