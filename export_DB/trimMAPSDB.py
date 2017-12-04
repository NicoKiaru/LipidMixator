import sys
'''
key=PUBCHEM_SUBSTANCE_URL
key=LIPID_MAPS_CMPD_URL
key=LM_ID
key=COMMON_NAME
key=SYSTEMATIC_NAME
key=SYNONYMS
key=CATEGORY
key=MAIN_CLASS
key=SUB_CLASS
key=EXACT_MASS
key=FORMULA
key=LIPIDBANK_ID
key=PUBCHEM_SID
key=PUBCHEM_CID
key=KEGG_ID
key=HMDBID
key=CHEBI_ID
key=INCHI_KEY
key=INCHI
key=STATUS
LMSDFDownload6Dec16FinalAll
'''
f = open('LMSDFDownload6Dec16FinalAll.sdf', 'r')
keysToKeep=['COMMON_NAME','SYSTEMATIC_NAME','SYNONYMS']#,'CATEGORY','MAIN_CLASS','SUB_CLASS']

#def acceptLine(line):
#    accept=True
#    accept = accept and line not in linesToRemove
#    if line.startswith

def getKey(line):
    return line[3:-2]
sys.stdout.write('var lipids_maps = [\n')
numberOfLipids=0;

while True:
    nameMolecule = f.readline()
    if not nameMolecule: break # EOF test
    numberOfLipids=numberOfLipids+1
    #print('molecule='+nameMolecule)
    sys.stdout.write('{')
    #sys.stdout.flush()
    #sys.stdout.flush()
    while True:
        line = f.readline()
        if (line.startswith('M  END')): break
    line = f.readline() #
    names=''
    mass=-1
    while not line.startswith('$$$$'):
        key = getKey(line)
        #print('key='+key)
        if key in keysToKeep:
            #sys.stdout.write( line ) # writes key
            #sys.stdout.flush()
            line = f.readline()
            names=names+line[:-1]+" | "
            #sys.stdout.write('"'+key+'":"'+line[:-1]+'",\n') # write value
            #sys.stdout.flush()
            line=f.readline() # skips last line
            if not line:break
        else:
            line = f.readline()
            if key=='EXACT_MASS':
                mass=line[:-1]
            line = f.readline()
            if not line:break
        line = f.readline()
    names = names.replace('"','\'\'')
    sys.stdout.write('value:"'+names+nameMolecule[:-1]+'",')
    sys.stdout.write('data:'+'{source:"MAPS",id:"'+nameMolecule[:-1]+'",mw:'+str(mass)+'}' ) # writes key
    sys.stdout.write('},\n')
    sys.stdout.flush()
sys.stdout.write('];\n')
sys.stdout.flush()
sys.stdout.write('//Total Number of Lipids = '+str(numberOfLipids)+'\n')
f.close()
