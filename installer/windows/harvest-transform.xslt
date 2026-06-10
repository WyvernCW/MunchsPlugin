<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:wix="http://wixtoolset.org/schemas/v4/wxs"
  exclude-result-prefixes="wix">

  <xsl:output method="xml" indent="yes" />

  <xsl:template match="@*|node()">
    <xsl:copy>
      <xsl:apply-templates select="@*|node()" />
    </xsl:copy>
  </xsl:template>

  <xsl:template match="wix:Wix">
    <Wix xmlns="http://wixtoolset.org/schemas/v4/wxs">
      <xsl:apply-templates />
    </Wix>
  </xsl:template>

  <!-- Exclude these directories -->
  <xsl:template match="wix:Directory[@Name='node_modules']" />
  <xsl:template match="wix:Directory[@Name='.git']" />
  <xsl:template match="wix:Directory[@Name='.vercel']" />
  <xsl:template match="wix:Directory[@Name='coverage']" />
  <xsl:template match="wix:Directory[@Name='dist']" />
  <xsl:template match="wix:Directory[@Name='.munchmemory']" />

  <!-- Exclude these files -->
  <xsl:template match="wix:Component[wix:File[contains(@Source, '.tgz')]]" />
  <xsl:template match="wix:Component[wix:File[contains(@Source, '.env')]]" />
  <xsl:template match="wix:Component[wix:File[contains(@Source, 'mcp-err.txt')]]" />
  <xsl:template match="wix:Component[wix:File[contains(@Source, 'mcp-test.txt')]]" />
  <xsl:template match="wix:Component[wix:File[contains(@Source, '.wixpdb')]]" />

</xsl:stylesheet>
